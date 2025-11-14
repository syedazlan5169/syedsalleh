<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsApproved
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Admins are always allowed (they should be auto-approved, but this is a safety measure)
        if ($user && ! $user->isAdmin() && ! $user->isApproved()) {
            return redirect()->route('approval.pending');
        }

        return $next($request);
    }
}
