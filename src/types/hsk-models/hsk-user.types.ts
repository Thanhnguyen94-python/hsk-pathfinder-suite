export type HSKUserRole = "student" | "teacher" | "logistics" | "care" | "admin";

export interface HSKBaseProfile {
  id: string;
  specific_id: string;
  full_name: string;
  email: string;
  role: HSKUserRole;
  avatar_url?: string | null;
}

export interface HSKStudentProfile extends HSKBaseProfile {
  enrolledCourses?: string[];
  progressPercentage?: number;
}

export interface HSKTeacherProfile extends HSKBaseProfile {
  averageRating?: number;
  totalReviews?: number;
  totalPenalties?: number;
}

export interface HSKLogisticsProfile extends HSKBaseProfile {
  region?: string;
}

export interface HSKCareProfile extends HSKBaseProfile {
  assignedStudents?: number;
}

export interface HSKAdminProfile extends HSKBaseProfile {
  managedTeams?: string[];
}
