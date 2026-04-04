/**
 * Basic email format validation using simple string checks.
 * Avoids regex-based approaches that can be vulnerable to ReDoS.
 */
export function isValidEmail(email: string): boolean {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return false; // must have characters before @
  if (atIndex === email.length - 1) return false; // must have characters after @
  const domain = email.slice(atIndex + 1);
  const dotIndex = domain.lastIndexOf(".");
  if (dotIndex <= 0) return false; // domain must have a dot after at least one char
  if (dotIndex === domain.length - 1) return false; // must have characters after the dot
  return true;
}

export interface PasswordStrength {
  valid: boolean;
  /** Human-readable failure reason, or undefined when valid. */
  message?: string;
  /** Individual rule results for live UI feedback. */
  rules: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
  };
}

/**
 * Validates password strength.
 * Requirements: ≥8 characters, at least one uppercase letter,
 * one lowercase letter, and one number.
 */
export function checkPasswordStrength(password: string): PasswordStrength {
  const rules = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };

  if (!rules.minLength) {
    return { valid: false, message: "Password must be at least 8 characters", rules };
  }
  if (!rules.hasUppercase) {
    return { valid: false, message: "Password must contain at least one uppercase letter", rules };
  }
  if (!rules.hasLowercase) {
    return { valid: false, message: "Password must contain at least one lowercase letter", rules };
  }
  if (!rules.hasNumber) {
    return { valid: false, message: "Password must contain at least one number", rules };
  }

  return { valid: true, rules };
}
