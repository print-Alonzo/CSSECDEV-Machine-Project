<script lang="ts">
        let { data } = $props();
        const user = $derived(data.user);
</script>

<svelte:head>
        <title>Dashboard</title>
</svelte:head>

<section class="card">
        <h2>Welcome, {user?.name}</h2>
        <p>Your role: <strong>{user?.role}</strong></p>
        {#if user?.lastLoginAt}
                <p>Last login: {user.lastLoginAt?.toString()} ({user.lastLoginResult})</p>
        {/if}
        <p>
                Use the navigation to manage orders. Administrators can review audit logs; managers can oversee all
                orders; customers manage only their own records.
        </p>
</section>

<style>
        .card {
                background: white;
                border-radius: 0.75rem;
                padding: 1.5rem;
                box-shadow: 0 10px 30px rgba(15, 23, 42, 0.1);
        }
</style>
