import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidEmail, checkPasswordStrength } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";

const dbAny = prisma as any;
const BOOTSTRAP_ORG_ID = "org_legacy_bootstrap";

// Allow 5 registrations per hour per IP
const REGISTER_RATE_LIMIT = { maxRequests: 5, windowMs: 60 * 60 * 1000 };
const MAX_FIELD_LENGTH = 320;

export async function POST(request: NextRequest) {
	try {
		const ip =
			request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
			request.headers.get("x-real-ip") ??
			"unknown";
		const rl = checkRateLimit(`register:${ip}`, REGISTER_RATE_LIMIT);
		if (!rl.allowed) {
			return NextResponse.json(
				{ error: `Too many registration attempts. Please try again in ${rl.retryAfterSeconds} seconds.` },
				{ status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
			);
		}

		const body = await request.json();
		const trimmedName = String(body.name ?? "").trim().slice(0, 100);
		const trimmedOrganizationName = String(body.organizationName ?? "").trim().slice(0, 120);
		const trimmedEmail = String(body.email ?? "").toLowerCase().trim().slice(0, MAX_FIELD_LENGTH);
		const password = String(body.password ?? "").slice(0, MAX_FIELD_LENGTH);

		if (!trimmedName) {
			return NextResponse.json({ error: "Name is required" }, { status: 400 });
		}
		if (!trimmedOrganizationName) {
			return NextResponse.json({ error: "Business name is required" }, { status: 400 });
		}
		if (!isValidEmail(trimmedEmail)) {
			return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
		}

		const pwCheck = checkPasswordStrength(password);
		if (!pwCheck.valid) {
			return NextResponse.json({ error: pwCheck.message }, { status: 400 });
		}

		const existing = await dbAny.appUser.findUnique({ where: { email: trimmedEmail } });
		if (existing) {
			return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
		}

		const passwordHash = await bcrypt.hash(password, 10);
		let user: { id: string; name: string; email: string; role: string; organization: { id: string; name: string } };
		try {
			user = await dbAny.$transaction(async (tx: any) => {
				const userCount = await tx.appUser.count();
				const organization =
					userCount === 0
						? ((await tx.organization.findUnique({
							where: { id: BOOTSTRAP_ORG_ID },
						}))
							? await tx.organization.update({
								where: { id: BOOTSTRAP_ORG_ID },
								data: {
									name: trimmedOrganizationName,
									contactEmail: trimmedEmail,
								},
							})
							: await tx.organization.create({
								data: {
									name: trimmedOrganizationName,
									contactEmail: trimmedEmail,
								},
							}))
						: await tx.organization.create({
							data: {
								name: trimmedOrganizationName,
								contactEmail: trimmedEmail,
							},
						});

				const createdUser = await tx.appUser.create({
					data: {
						name: trimmedName,
						email: trimmedEmail,
						role: "SUPER_ADMIN",
						passwordHash,
						organizationId: organization.id,
					},
					include: {
						organization: { select: { id: true, name: true } },
					},
				});

				await tx.settings.upsert({
					where: { organizationId: organization.id },
					update: {},
					create: {
						organizationId: organization.id,
					},
				});

				return createdUser;
			});
		} catch (createErr: unknown) {
			const code = (createErr as { code?: string })?.code;
			if (code === "P2002") {
				return NextResponse.json(
					{ error: "An account with this email already exists" },
					{ status: 409 }
				);
			}
			throw createErr;
		}

		return NextResponse.json(
			{
				ok: true,
				role: user.role,
				name: user.name,
				organizationId: user.organization.id,
				organizationName: user.organization.name,
				requiresLogin: true,
			},
			{ status: 201 }
		);
	} catch (err) {
		console.error("Register error:", err);
		return NextResponse.json({ error: "Registration failed" }, { status: 500 });
	}
}