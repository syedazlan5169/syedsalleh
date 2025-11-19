<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$request = Request::capture();

if (strpos($request->getPathInfo(), '/storage/') === 0) {
    $relativePath = ltrim(str_replace('/storage/', '', $request->getPathInfo()), '/');
    $disk = Storage::disk('public');
    
    if ($disk->exists($relativePath)) {
        $fullPath = $disk->path($relativePath);
        
        if (file_exists($fullPath)) {
            return response()->file($fullPath)->send();
        }
        
        // Log if Storage says it exists but file doesn't
        \Log::error('Storage file path mismatch', [
            'relative_path' => $relativePath,
            'full_path' => $fullPath,
            'exists_in_storage' => $disk->exists($relativePath),
            'file_exists' => file_exists($fullPath),
        ]);
    } else {
        // Log if file doesn't exist in Storage
        \Log::warning('Storage file not found in index.php', [
            'relative_path' => $relativePath,
            'storage_root' => storage_path('app/public'),
        ]);
    }
}

$app->handleRequest($request);
