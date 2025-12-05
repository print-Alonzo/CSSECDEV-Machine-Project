<script lang="ts">
        import favicon from '$lib/assets/favicon.svg';
        import { enhance } from '$app/forms';

        let { children, data } = $props();
        const user = $derived(data.user);
</script>

<svelte:head>
        <link rel="icon" href={favicon} />
</svelte:head>

<header class="topbar">
        <a class="brand" href="/">Secure Orders</a>
        {#if user}
                <nav class="nav">
                        <a href="/dashboard">Dashboard</a>
                        <a href="/orders">Orders</a>
                        {#if user.role === 'ADMIN'}
                                <a href="/admin/logs">Audit Logs</a>
                        {/if}
                        <a href="/settings/security">Security</a>
                </nav>
                <form method="POST" action="/logout" use:enhance class="logout">
                        <span class="user">{user.name} ({user.role})</span>
                        <button type="submit">Logout</button>
                </form>
        {:else}
                <nav class="nav">
                        <a href="/login">Login</a>
                        <a href="/register">Register</a>
                </nav>
        {/if}
</header>

<main class="page">{@render children()}</main>

<style>
        :global(body) {
                margin: 0;
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                background: #f8fafc;
                color: #0f172a;
        }
        .topbar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.75rem 1.5rem;
                background: #0f172a;
                color: #e2e8f0;
        }
        .nav {
                display: flex;
                gap: 1rem;
                align-items: center;
        }
        .nav a {
                color: #e2e8f0;
                text-decoration: none;
                font-weight: 600;
        }
        .brand {
                color: #a5b4fc;
                font-weight: 700;
                text-decoration: none;
        }
        .logout {
                display: flex;
                gap: 0.75rem;
                align-items: center;
        }
        button {
                background: #2563eb;
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 0.375rem;
                cursor: pointer;
        }
        .page {
                max-width: 960px;
                margin: 2rem auto;
                padding: 0 1rem;
        }
        @media (max-width: 720px) {
                .topbar {
                        flex-direction: column;
                        gap: 0.75rem;
                        align-items: flex-start;
                }
        }
</style>
