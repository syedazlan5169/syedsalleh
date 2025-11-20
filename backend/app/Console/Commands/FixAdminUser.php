<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class FixAdminUser extends Command
{
    protected $signature = 'admin:fix {email?}';
    protected $description = 'Fix admin user status and approval';

    public function handle()
    {
        $email = $this->argument('email') ?? 'syedazlan5169@gmail.com';
        
        $user = User::where('email', $email)->first();
        
        if (!$user) {
            $this->error("User with email '{$email}' not found!");
            return 1;
        }
        
        $user->update([
            'is_admin' => true,
            'approved_at' => now(),
        ]);
        
        $this->info("✅ User '{$user->email}' is now an admin and approved!");
        $this->info("   Please log out and log back in to see the admin menu.");
        
        return 0;
    }
}

