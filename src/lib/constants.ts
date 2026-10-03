// Role hierarchy from highest to lowest
export const ROLE_HIERARCHY = ['ADMIN', 'PAYROLL', 'HOD', 'MENTOR', 'STUDENT'] as const;

export type UserRole = typeof ROLE_HIERARCHY[number];
export type ExpenseStatus = 'LOGGED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type PaymentMode = 'CASH' | 'UPI' | 'BANK';
export type ApprovalAction = 'APPROVED' | 'REJECTED';

export const EXPENSE_CATEGORIES = [
  'Travel',
  'Food & Meals',
  'Equipment',
  'Stationery',
  'Events',
  'Training',
  'Sports',
  'Miscellaneous'
] as const;

export const STATUS_COLORS: Record<ExpenseStatus, string> = {
  LOGGED: 'bg-blue-100 text-blue-800',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800'
};

export const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: 'bg-purple-100 text-purple-800',
  PAYROLL: 'bg-indigo-100 text-indigo-800',
  HOD: 'bg-blue-100 text-blue-800',
  MENTOR: 'bg-teal-100 text-teal-800',
  STUDENT: 'bg-gray-100 text-gray-800'
};

// Get next approver role in hierarchy
export function getNextApproverRole(currentRole: UserRole): UserRole | null {
  const index = ROLE_HIERARCHY.indexOf(currentRole);
  if (index === 0) return null; // ADMIN has no higher role
  return ROLE_HIERARCHY[index - 1];
}

// Check if user can approve expenses from a given role
export function canApprove(approverRole: UserRole, creatorRole: UserRole): boolean {
  const approverIndex = ROLE_HIERARCHY.indexOf(approverRole);
  const creatorIndex = ROLE_HIERARCHY.indexOf(creatorRole);
  return approverIndex === creatorIndex - 1;
}
