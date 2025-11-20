# Admin Access Guide

This guide explains how to access and use the admin functionality in the application.

## Step 1: Create an Admin User

You have several options to create an admin user:

### Option A: Using the Seeder (Recommended)

Run the admin user seeder:

```bash
cd backend
php artisan db:seed --class=AdminUserSeeder
```

This will create an admin user with:
- **Email**: `admin@example.com`
- **Password**: `password`
- **Name**: Admin User

### Option B: Using Tinker

You can create an admin user manually using Laravel Tinker:

```bash
cd backend
php artisan tinker
```

Then run:
```php
\App\Models\User::create([
    'name' => 'Admin User',
    'email' => 'admin@example.com',
    'password' => \Illuminate\Support\Facades\Hash::make('your-password'),
    'is_admin' => true,
    'approved_at' => now(),
]);
```

### Option C: Update Existing User to Admin

If you already have a user account, you can make them an admin:

```bash
cd backend
php artisan tinker
```

Then run:
```php
$user = \App\Models\User::where('email', 'your-email@example.com')->first();
$user->update([
    'is_admin' => true,
    'approved_at' => now(),
]);
```

## Step 2: Access Admin Features

### Web Interface (Laravel Application)

1. **Login** to the application with your admin account
2. **Navigate to Admin Dashboard**:
   - Click on "Admin Dashboard" in the sidebar (under "Administration" section)
   - Or go directly to: `http://your-domain/admin`

3. **Available Admin Pages**:
   - **Admin Dashboard** (`/admin`) - Overview with statistics
   - **User Approvals** (`/admin/users`) - Approve/reject pending users
   - **Suggestions** (`/admin/suggestions`) - View and manage user suggestions
   - **Activity Log** (`/admin/activity`) - View system activity logs

### API Endpoints (Mobile/External Access)

All admin API endpoints are prefixed with `/api/admin/` and require:
- Authentication token (via `auth:sanctum` middleware)
- Admin privileges (via `admin` middleware)

**Base URL**: `http://your-domain/api/admin/`

#### User Management:
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/{id}` - Get user details
- `POST /api/admin/users/{id}/approve` - Approve a user
- `POST /api/admin/users/{id}/reject` - Reject a user
- `POST /api/admin/users/{id}/make-admin` - Promote user to admin
- `POST /api/admin/users/{id}/remove-admin` - Remove admin privileges
- `DELETE /api/admin/users/{id}` - Delete a user

#### People Management:
- `GET /api/admin/people` - List all people
- `PUT /api/admin/people/{id}` - Edit any person
- `DELETE /api/admin/people/{id}` - Delete any person

#### Documents Management:
- `GET /api/admin/documents` - List all documents
- `DELETE /api/admin/documents/{id}` - Delete any document

#### Statistics:
- `GET /api/admin/statistics` - Get admin statistics

**Example API Request**:
```bash
curl -X GET http://your-domain/api/admin/users \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Accept: application/json"
```

## Step 3: Verify Admin Access

After logging in as an admin, you should see:
- An "Administration" section in the sidebar with admin links
- Access to all admin pages without 403 errors
- Ability to approve/reject users
- Full access to manage all people and documents

## Troubleshooting

### Can't see admin links in sidebar?
- Make sure you're logged in with an admin account
- Check that `is_admin` is `true` in the database
- Clear browser cache and refresh

### Getting 403 Forbidden errors?
- Verify your user has `is_admin = true` in the database
- Make sure `approved_at` is not null
- Check that you're using the correct authentication token (for API)

### Admin user not created?
- Make sure migrations are run: `php artisan migrate`
- Check that the seeder ran successfully
- Verify the user exists in the database: `php artisan tinker` then `User::where('is_admin', true)->get()`

## Security Notes

⚠️ **Important**: 
- Change the default admin password immediately after first login
- Never commit admin credentials to version control
- Use strong passwords for admin accounts
- Regularly review admin user list
- Admins have full system access - use with caution

