<?php

/**
 * Quick script to check and set admin status
 * Run: php check_admin.php
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;

echo "=== Admin User Checker ===\n\n";

// List all users
$users = User::all();

if ($users->isEmpty()) {
    echo "No users found in database.\n";
    exit(1);
}

echo "Current Users:\n";
echo str_repeat("-", 80) . "\n";
foreach ($users as $user) {
    $adminStatus = $user->is_admin ? "✓ ADMIN" : "✗ Regular";
    $approvedStatus = $user->isApproved() ? "✓ Approved" : "✗ Pending";
    printf(
        "ID: %-5d | Email: %-30s | %-10s | %-10s\n",
        $user->id,
        $user->email,
        $adminStatus,
        $approvedStatus
    );
}

echo "\n" . str_repeat("-", 80) . "\n\n";

// Check if any admin exists
$adminCount = User::where('is_admin', true)->count();
echo "Total Admins: {$adminCount}\n\n";

if ($adminCount === 0) {
    echo "⚠️  No admin users found!\n\n";
    echo "Would you like to make a user an admin? (y/n): ";
    $handle = fopen("php://stdin", "r");
    $line = fgets($handle);
    $answer = trim(strtolower($line));
    
    if ($answer === 'y' || $answer === 'yes') {
        echo "\nEnter user email to make admin: ";
        $email = trim(fgets($handle));
        
        $user = User::where('email', $email)->first();
        
        if (!$user) {
            echo "❌ User not found!\n";
            exit(1);
        }
        
        $user->update([
            'is_admin' => true,
            'approved_at' => now(),
        ]);
        
        echo "✅ User '{$user->email}' is now an admin!\n";
        echo "   Please log out and log back in to see admin menu.\n";
    }
    
    fclose($handle);
} else {
    echo "✅ Admin users exist. If you don't see the menu:\n";
    echo "   1. Make sure you're logged in as one of the admin users\n";
    echo "   2. Clear your browser cache and refresh\n";
    echo "   3. Try logging out and back in\n";
}

echo "\n";

