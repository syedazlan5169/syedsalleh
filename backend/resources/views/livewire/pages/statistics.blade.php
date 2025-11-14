<?php

use App\Models\Document;
use App\Models\Person;
use App\Models\User;

use function Livewire\Volt\computed;

$totalPeople = computed(fn () => Person::count());
$totalUsers = computed(fn () => User::count());
$totalDocuments = computed(fn () => Document::count());
$peopleThisMonth = computed(fn () => Person::whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->count());
$usersThisMonth = computed(fn () => User::whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->count());
$documentsThisMonth = computed(fn () => Document::whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->count());

$genderDistribution = computed(function () {
    return Person::selectRaw('gender, COUNT(*) as count')
        ->groupBy('gender')
        ->get()
        ->pluck('count', 'gender');
});

$documentTypes = computed(function () {
    return Document::selectRaw('
        CASE 
            WHEN mime_type LIKE "image/%" THEN "Images"
            WHEN mime_type LIKE "application/pdf" THEN "PDFs"
            ELSE "Other"
        END as type,
        COUNT(*) as count
    ')
        ->groupBy('type')
        ->get()
        ->pluck('count', 'type');
});

$topUsers = computed(function () {
    $connection = \Illuminate\Support\Facades\DB::connection()->getDriverName();

    if ($connection === 'sqlite') {
        // SQLite doesn't support HAVING on non-aggregate queries the same way
        // Use whereHas to filter first, then withCount
        return User::whereHas('people')
            ->withCount('people')
            ->orderBy('people_count', 'desc')
            ->limit(5)
            ->get();
    }

    // MySQL/PostgreSQL approach
    return User::withCount('people')
        ->having('people_count', '>', 0)
        ->orderBy('people_count', 'desc')
        ->limit(5)
        ->get();
});

$ageGroups = computed(function () {
    $people = Person::all();
    $groups = [
        '0-17' => 0,
        '18-25' => 0,
        '26-35' => 0,
        '36-50' => 0,
        '51-65' => 0,
        '65+' => 0,
    ];

    foreach ($people as $person) {
        $age = $person->date_of_birth->age;
        if ($age < 18) {
            $groups['0-17']++;
        } elseif ($age <= 25) {
            $groups['18-25']++;
        } elseif ($age <= 35) {
            $groups['26-35']++;
        } elseif ($age <= 50) {
            $groups['36-50']++;
        } elseif ($age <= 65) {
            $groups['51-65']++;
        } else {
            $groups['65+']++;
        }
    }

    return $groups;
});

$publicDocuments = computed(fn () => Document::where('is_public', true)->count());
$privateDocuments = computed(fn () => Document::where('is_public', false)->count());
$averageDocumentsPerPerson = computed(function () {
    $peopleWithDocs = Person::has('documents')->count();

    return $peopleWithDocs > 0 ? round(Document::count() / $peopleWithDocs, 1) : 0;
});

$recentPeople = computed(fn () => Person::with('user')->latest()->limit(5)->get());
$recentDocuments = computed(fn () => Document::with('person')->latest()->limit(5)->get()); ?>

<div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-6">
    <div class="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 sm:px-6">
        <div class="flex items-center justify-between">
            <h1 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{{ __('Statistics') }}</h1>
            <flux:button href="{{ route('dashboard') }}" variant="ghost" size="sm" class="text-sm sm:text-base">
                {{ __('Back') }}
            </flux:button>
        </div>
    </div>

    <div class="px-4 sm:px-6 pt-4 sm:pt-6">
        <div class="grid gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <!-- Overview Cards -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                        <svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                    </div>
                    <div>
                        <flux:text class="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">{{ __('Total People') }}</flux:text>
                        <flux:heading size="xl" class="text-neutral-900 dark:text-neutral-100">{{ number_format($this->totalPeople) }}</flux:heading>
                    </div>
                </div>
                <div class="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <flux:text class="text-xs text-neutral-600 dark:text-neutral-400">
                        <span class="font-semibold text-green-600 dark:text-green-400">{{ $this->peopleThisMonth }}</span> {{ __('added this month') }}
                    </flux:text>
                </div>
            </div>

            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                        </svg>
                    </div>
                    <div>
                        <flux:text class="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">{{ __('Total Users') }}</flux:text>
                        <flux:heading size="xl" class="text-neutral-900 dark:text-neutral-100">{{ number_format($this->totalUsers) }}</flux:heading>
                    </div>
                </div>
                <div class="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <flux:text class="text-xs text-neutral-600 dark:text-neutral-400">
                        <span class="font-semibold text-green-600 dark:text-green-400">{{ $this->usersThisMonth }}</span> {{ __('registered this month') }}
                    </flux:text>
                </div>
            </div>

            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                        <svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                    <div>
                        <flux:text class="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">{{ __('Total Documents') }}</flux:text>
                        <flux:heading size="xl" class="text-neutral-900 dark:text-neutral-100">{{ number_format($this->totalDocuments) }}</flux:heading>
                    </div>
                </div>
                <div class="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <flux:text class="text-xs text-neutral-600 dark:text-neutral-400">
                        <span class="font-semibold text-green-600 dark:text-green-400">{{ $this->documentsThisMonth }}</span> {{ __('uploaded this month') }}
                    </flux:text>
                </div>
            </div>

            <!-- Gender Distribution -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm">
                <flux:heading size="lg" class="mb-4 text-neutral-900 dark:text-neutral-100">{{ __('Gender Distribution') }}</flux:heading>
                @php
                    $genderData = $this->genderDistribution;
                    $total = $genderData->sum();
                @endphp
                @if($total > 0)
                    <div class="space-y-3">
                        @foreach($genderData as $gender => $count)
                            @php
                                $percentage = round(($count / $total) * 100, 1);
                            @endphp
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <flux:text class="text-sm font-medium text-neutral-700 dark:text-neutral-300">{{ $gender }}</flux:text>
                                    <flux:text class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{{ $count }} ({{ $percentage }}%)</flux:text>
                                </div>
                                <div class="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2.5">
                                    <div class="h-2.5 rounded-full transition-all duration-500 {{ $gender === 'Male' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-pink-500 to-pink-600' }}" style="width: {{ $percentage }}%"></div>
                                </div>
                            </div>
                        @endforeach
                    </div>
                @else
                    <flux:text class="text-sm text-neutral-500 dark:text-neutral-400">{{ __('No data available') }}</flux:text>
                @endif
            </div>

            <!-- Document Types -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm">
                <flux:heading size="lg" class="mb-4 text-neutral-900 dark:text-neutral-100">{{ __('Document Types') }}</flux:heading>
                @php
                    $docTypes = $this->documentTypes;
                    $docTotal = $docTypes->sum();
                @endphp
                @if($docTotal > 0)
                    <div class="space-y-3">
                        @foreach($docTypes as $type => $count)
                            @php
                                $percentage = round(($count / $docTotal) * 100, 1);
                                $colorClass = match($type) {
                                    'PDFs' => 'bg-gradient-to-r from-red-500 to-red-600',
                                    'Images' => 'bg-gradient-to-r from-purple-500 to-purple-600',
                                    default => 'bg-gradient-to-r from-neutral-500 to-neutral-600',
                                };
                            @endphp
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <flux:text class="text-sm font-medium text-neutral-700 dark:text-neutral-300">{{ $type }}</flux:text>
                                    <flux:text class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{{ $count }} ({{ $percentage }}%)</flux:text>
                                </div>
                                <div class="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2.5">
                                    <div class="{{ $colorClass }} h-2.5 rounded-full transition-all duration-500" style="width: {{ $percentage }}%"></div>
                                </div>
                            </div>
                        @endforeach
                    </div>
                @else
                    <flux:text class="text-sm text-neutral-500 dark:text-neutral-400">{{ __('No documents uploaded yet') }}</flux:text>
                @endif
            </div>

            <!-- Document Visibility -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm">
                <flux:heading size="lg" class="mb-4 text-neutral-900 dark:text-neutral-100">{{ __('Document Visibility') }}</flux:heading>
                @php
                    $publicCount = $this->publicDocuments;
                    $privateCount = $this->privateDocuments;
                    $visibilityTotal = $publicCount + $privateCount;
                @endphp
                @if($visibilityTotal > 0)
                    <div class="space-y-3">
                        <div>
                            <div class="flex items-center justify-between mb-1.5">
                                <flux:text class="text-sm font-medium text-neutral-700 dark:text-neutral-300">{{ __('Public') }}</flux:text>
                                <flux:text class="text-sm font-semibold text-green-600 dark:text-green-400">{{ $publicCount }} ({{ round(($publicCount / $visibilityTotal) * 100, 1) }}%)</flux:text>
                            </div>
                            <div class="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2.5">
                                <div class="bg-gradient-to-r from-green-500 to-green-600 h-2.5 rounded-full transition-all duration-500" style="width: {{ round(($publicCount / $visibilityTotal) * 100, 1) }}%"></div>
                            </div>
                        </div>
                        <div>
                            <div class="flex items-center justify-between mb-1.5">
                                <flux:text class="text-sm font-medium text-neutral-700 dark:text-neutral-300">{{ __('Private') }}</flux:text>
                                <flux:text class="text-sm font-semibold text-neutral-600 dark:text-neutral-400">{{ $privateCount }} ({{ round(($privateCount / $visibilityTotal) * 100, 1) }}%)</flux:text>
                            </div>
                            <div class="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2.5">
                                <div class="bg-gradient-to-r from-neutral-500 to-neutral-600 h-2.5 rounded-full transition-all duration-500" style="width: {{ round(($privateCount / $visibilityTotal) * 100, 1) }}%"></div>
                            </div>
                        </div>
                    </div>
                @else
                    <flux:text class="text-sm text-neutral-500 dark:text-neutral-400">{{ __('No documents uploaded yet') }}</flux:text>
                @endif
            </div>

            <!-- Top Users -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm">
                <flux:heading size="lg" class="mb-4 text-neutral-900 dark:text-neutral-100">{{ __('Top Contributors') }}</flux:heading>
                @if($this->topUsers->isNotEmpty())
                    <div class="space-y-3">
                        @foreach($this->topUsers as $index => $user)
                            <div class="flex items-center gap-3">
                                <div class="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                                    {{ $index + 1 }}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <flux:text class="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{{ ucwords(strtolower($user->name)) }}</flux:text>
                                </div>
                                <div class="flex-shrink-0">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                        {{ $user->people_count }} {{ __('people') }}
                                    </span>
                                </div>
                            </div>
                        @endforeach
                    </div>
                @else
                    <flux:text class="text-sm text-neutral-500 dark:text-neutral-400">{{ __('No data available') }}</flux:text>
                @endif
            </div>

            <!-- Age Groups -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm">
                <flux:heading size="lg" class="mb-4 text-neutral-900 dark:text-neutral-100">{{ __('Age Distribution') }}</flux:heading>
                @php
                    $ageData = $this->ageGroups;
                    $ageTotal = array_sum($ageData);
                @endphp
                @if($ageTotal > 0)
                    <div class="space-y-3">
                        @foreach($ageData as $range => $count)
                            @php
                                $percentage = round(($count / $ageTotal) * 100, 1);
                            @endphp
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <flux:text class="text-sm font-medium text-neutral-700 dark:text-neutral-300">{{ $range }} {{ __('years') }}</flux:text>
                                    <flux:text class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{{ $count }} ({{ $percentage }}%)</flux:text>
                                </div>
                                <div class="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2.5">
                                    <div class="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500" style="width: {{ $percentage }}%"></div>
                                </div>
                            </div>
                        @endforeach
                    </div>
                @else
                    <flux:text class="text-sm text-neutral-500 dark:text-neutral-400">{{ __('No data available') }}</flux:text>
                @endif
            </div>

            <!-- Additional Stats -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm">
                <flux:heading size="lg" class="mb-4 text-neutral-900 dark:text-neutral-100">{{ __('Additional Metrics') }}</flux:heading>
                <div class="space-y-4">
                    <div class="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                        <flux:text class="text-sm text-neutral-600 dark:text-neutral-400">{{ __('Average Documents per Person') }}</flux:text>
                        <flux:text class="text-lg font-bold text-neutral-900 dark:text-neutral-100">{{ $this->averageDocumentsPerPerson }}</flux:text>
                    </div>
                    <div class="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                        <flux:text class="text-sm text-neutral-600 dark:text-neutral-400">{{ __('People with Documents') }}</flux:text>
                        <flux:text class="text-lg font-bold text-neutral-900 dark:text-neutral-100">{{ Person::has('documents')->count() }}</flux:text>
                    </div>
                    <div class="flex items-center justify-between">
                        <flux:text class="text-sm text-neutral-600 dark:text-neutral-400">{{ __('People without Documents') }}</flux:text>
                        <flux:text class="text-lg font-bold text-neutral-900 dark:text-neutral-100">{{ Person::doesntHave('documents')->count() }}</flux:text>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
