<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Person extends Model
{
    /** @use HasFactory<\Database\Factories\PersonFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'name',
        'nric',
        'date_of_birth',
        'gender',
        'blood_type',
        'occupation',
        'address',
        'phone',
        'email',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
        ];
    }

    /**
     * Get the user that owns the person.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the documents for the person.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    /**
     * Scope a query to only include people with upcoming birthdays.
     */
    public function scopeUpcomingBirthdays($query, int $days = 30)
    {
        $today = now();
        $endDate = $today->copy()->addDays($days);

        $connection = $query->getConnection()->getDriverName();

        if ($connection === 'sqlite') {
            // SQLite approach
            $todayMonthDay = $today->format('m-d');
            $endMonthDay = $endDate->format('m-d');

            // If the end date doesn't cross year boundary
            if ($endDate->year === $today->year && $endDate->month >= $today->month) {
                return $query->whereRaw(
                    "strftime('%m-%d', date_of_birth) >= ? AND strftime('%m-%d', date_of_birth) <= ?",
                    [$todayMonthDay, $endMonthDay]
                )->orderByRaw("strftime('%m-%d', date_of_birth)");
            }

            // Handle year-end wrap around (e.g., Dec 25 to Jan 5)
            return $query->where(function ($q) use ($todayMonthDay, $endMonthDay) {
                $q->whereRaw("strftime('%m-%d', date_of_birth) >= ?", [$todayMonthDay])
                    ->orWhereRaw("strftime('%m-%d', date_of_birth) <= ?", [$endMonthDay]);
            })->orderByRaw("
                CASE 
                    WHEN strftime('%m-%d', date_of_birth) >= ? THEN 0
                    ELSE 1
                END,
                strftime('%m-%d', date_of_birth)
            ", [$todayMonthDay]);
        }

        // MySQL/PostgreSQL approach
        $todayMonthDay = $today->format('m-d');
        $endMonthDay = $endDate->format('m-d');

        // If the end date doesn't cross year boundary
        if ($endDate->year === $today->year && $endDate->month >= $today->month) {
            return $query->whereRaw(
                "DATE_FORMAT(date_of_birth, '%m-%d') >= ? AND DATE_FORMAT(date_of_birth, '%m-%d') <= ?",
                [$todayMonthDay, $endMonthDay]
            )->orderByRaw("DATE_FORMAT(date_of_birth, '%m-%d')");
        }

        // Handle year-end wrap around (e.g., Dec 25 to Jan 5)
        return $query->where(function ($q) use ($todayMonthDay, $endMonthDay) {
            $q->whereRaw("DATE_FORMAT(date_of_birth, '%m-%d') >= ?", [$todayMonthDay])
                ->orWhereRaw("DATE_FORMAT(date_of_birth, '%m-%d') <= ?", [$endMonthDay]);
        })->orderByRaw("
            CASE 
                WHEN DATE_FORMAT(date_of_birth, '%m-%d') >= ? THEN 0
                ELSE 1
            END,
            DATE_FORMAT(date_of_birth, '%m-%d')
        ", [$todayMonthDay]);
    }

    /**
     * Get the next birthday date for this person.
     */
    public function getNextBirthdayAttribute()
    {
        $today = now();
        $thisYear = $today->year;
        $birthday = $this->date_of_birth->setYear($thisYear);

        // If birthday has passed this year, use next year
        if ($birthday->isPast()) {
            $birthday->addYear();
        }

        return $birthday;
    }

    /**
     * Get the number of days until the next birthday.
     */
    public function getDaysUntilBirthdayAttribute(): int
    {
        return now()->diffInDays($this->next_birthday, false);
    }
}
