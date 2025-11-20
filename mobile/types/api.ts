export type User = {
  id: number;
  name: string;
  nickname?: string | null;
  email: string;
  is_admin?: boolean;
};

export type DashboardStats = {
  my_people_count: number;
  all_people_count: number;
  favorites_count: number;
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
  phone: string[] | null;
  gender?: string | null;
  date_of_birth: string | null;
  age_years: number | null;
  age_months: number | null;
  owner_name?: string | null;
  is_favorite?: boolean;
};

export type DashboardData = {
  user: User;
  stats: DashboardStats;
  upcoming_birthdays: UpcomingBirthday[];
  my_people: MyPerson[];
};

export type PersonDocument = {
  id: number;
  name: string;
  original_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  is_public: boolean;
  file_url: string;
  created_at: string | null;
  updated_at: string | null;
};

export type PersonDetail = MyPerson & {
  gender?: string | null;
  blood_type?: string | null;
  occupation?: string | null;
  address?: string | null;
  owner_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  documents?: PersonDocument[];
  can_manage_documents?: boolean;
};

export type Notification = {
  id: number;
  type: string;
  title: string;
  message: string;
  person_id: number | null;
  read: boolean;
  read_at: string | null;
  created_at: string | null;
};

export type NotificationsResponse = {
  notifications: Notification[];
  unread_count: number;
};

