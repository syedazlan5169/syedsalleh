<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule birthday notifications to run daily at 8 AM
Schedule::command('birthdays:notify --days=1')
    ->dailyAt('08:00')
    ->description('Send notifications for birthdays tomorrow');

// Also send notifications for birthdays today at 7 AM
Schedule::command('birthdays:notify --days=0')
    ->dailyAt('07:00')
    ->description('Send notifications for birthdays today');
