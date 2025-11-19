<?php

namespace App\Console\Commands;

use App\Models\DeviceToken;
use App\Models\Notification;
use App\Models\Person;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SendBirthdayNotifications extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'birthdays:notify {--days=1 : Number of days ahead to check for birthdays}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send notifications for upcoming birthdays';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $daysAhead = (int) $this->option('days');
        $today = now();
        $targetDate = $today->copy()->addDays($daysAhead);

        $this->info("Checking for birthdays {$daysAhead} day(s) from now ({$targetDate->toDateString()})...");

        // Find people whose birthday is on the target date
        $people = Person::query()
            ->whereNotNull('date_of_birth')
            ->get()
            ->filter(function (Person $person) use ($targetDate) {
                $birthdayThisYear = $person->date_of_birth->setYear($targetDate->year);
                return $birthdayThisYear->isSameDay($targetDate);
            });

        if ($people->isEmpty()) {
            $this->info('No birthdays found for the target date.');
            return Command::SUCCESS;
        }

        $this->info("Found {$people->count()} birthday(s) to notify about.");

        $allUsers = User::all();
        $totalNotifications = 0;
        $totalPushTokens = [];

        foreach ($people as $person) {
            $age = $person->age_breakdown;
            $ageText = $age['years'] !== null ? "turning {$age['years']}" : '';
            $daysText = $daysAhead === 0 ? 'today' : ($daysAhead === 1 ? 'tomorrow' : "in {$daysAhead} days");

            foreach ($allUsers as $user) {
                // Create in-app notification
                Notification::create([
                    'user_id' => $user->id,
                    'type' => 'birthday_reminder',
                    'title' => $daysAhead === 0 ? 'Birthday Today!' : 'Upcoming Birthday',
                    'message' => "{$person->name} {$ageText} birthday is {$daysText}!",
                    'person_id' => $person->id,
                    'read' => false,
                ]);

                // Collect push tokens
                $userTokens = $user->deviceTokens()->pluck('token')->toArray();
                $totalPushTokens = array_merge($totalPushTokens, $userTokens);
            }

            $totalNotifications += $allUsers->count();
        }

        // Send push notifications
        if (! empty($totalPushTokens)) {
            $uniqueTokens = array_unique($totalPushTokens);
            $message = $people->count() === 1
                ? "{$people->first()->name}'s birthday is {$daysText}!"
                : "You have {$people->count()} birthdays coming up {$daysText}!";

            $this->sendPushNotifications(
                array_values($uniqueTokens),
                $daysAhead === 0 ? 'Birthday Today!' : 'Upcoming Birthday',
                $message,
                [
                    'type' => 'birthday_reminder',
                    'person_id' => $people->count() === 1 ? $people->first()->id : null,
                ]
            );

            $this->info("Sent push notifications to ".count($uniqueTokens)." device(s).");
        }

        $this->info("Created {$totalNotifications} in-app notification(s).");
        $this->info('Birthday notifications sent successfully!');

        return Command::SUCCESS;
    }

    /**
     * Send push notification via Expo Push Notification service
     */
    private function sendPushNotifications(array $tokens, string $title, string $body, array $data = []): void
    {
        if (empty($tokens)) {
            return;
        }

        $expoAccessToken = env('EXPO_ACCESS_TOKEN');
        $expoApiUrl = 'https://exp.host/--/api/v2/push/send';

        $messages = [];
        foreach ($tokens as $token) {
            $messages[] = [
                'to' => $token,
                'sound' => 'default',
                'title' => $title,
                'body' => $body,
                'data' => $data,
            ];
        }

        $headers = [
            'Accept' => 'application/json',
            'Accept-Encoding' => 'gzip, deflate',
            'Content-Type' => 'application/json',
        ];

        if ($expoAccessToken) {
            $headers['Authorization'] = 'Bearer '.$expoAccessToken;
        }

        try {
            $response = Http::withHeaders($headers)
                ->post($expoApiUrl, $messages);

            if (! $response->successful()) {
                $this->error('Failed to send push notifications: '.$response->body());
            }
        } catch (\Exception $e) {
            $this->error('Push notification error: '.$e->getMessage());
        }
    }
}
