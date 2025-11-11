<?php

namespace App\Listeners;

use App\Support\ActivityLogger;
use Illuminate\Auth\Events\Login;

class LogSuccessfulLogin
{
    public function handle(Login $event): void
    {
        ActivityLogger::log(
            'auth.login',
            __(':name logged in', ['name' => $event->user->name ?? __('Unknown User')]),
            $event->user
        );
    }
}
