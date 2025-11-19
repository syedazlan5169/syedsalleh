export type User = {
  id: number;
  name: string;
  email: string;
};

export type DashboardStats = {
  my_people_count: number;
  all_people_count: number;
};

export type UpcomingBirthday = {
  id: number;
  name: string;
  nric: string | null;
  date_of_birth: string | null;
  next_birthday_date: string;
  days_until: number;
  owned_by_current_user: boolean;
  owner_name: string | null;
};

export type MyPerson = {
  id: number;
  name: string;
  nric: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  age_years: number | null;
  age_months: number | null;
  owner_name?: string | null;
};

export type DashboardData = {
  user: User;
  stats: DashboardStats;
  upcoming_birthdays: UpcomingBirthday[];
  my_people: MyPerson[];
};

export type PersonDetail = MyPerson & {
  gender?: string | null;
  blood_type?: string | null;
  occupation?: string | null;
  address?: string | null;
  owner_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

