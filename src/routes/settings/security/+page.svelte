<script lang="ts">
        import { PASSWORD_RULE_DESCRIPTION } from '$lib/validation';
        import { enhance } from '$app/forms';

        let { form } = $props();
        const error = $derived(form?.error as string | undefined);
        const success = $derived(form?.success as boolean | undefined);
</script>

<svelte:head>
        <title>Security Settings</title>
</svelte:head>

<section class="card">
        <h2>Change Password</h2>
        <form method="POST" action="?/changePassword" use:enhance>
                <label>
                        Current password
                        <input name="current" type="password" autocomplete="current-password" required />
                </label>
                <label>
                        New password
                        <input name="next" type="password" autocomplete="new-password" required />
                </label>
                <label>
                        Confirm new password
                        <input name="confirm" type="password" autocomplete="new-password" required />
                </label>
                <p class="hint">{PASSWORD_RULE_DESCRIPTION}. Password reuse is blocked and 1-day minimum age enforced.</p>
                {#if error}
                        <div class="error">{error}</div>
                {/if}
                {#if success}
                        <div class="success">Password updated.</div>
                {/if}
                <button type="submit">Update password</button>
        </form>
</section>

<style>
        .card {
                background: white;
                padding: 1.5rem;
                border-radius: 0.75rem;
                box-shadow: 0 10px 30px rgba(15, 23, 42, 0.1);
        }
        form { display: flex; flex-direction: column; gap: 1rem; }
        label { display: flex; flex-direction: column; gap: 0.35rem; }
        input { padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; }
        .hint { color: #475569; }
        .error { color: #b91c1c; }
        .success { color: #15803d; }
        button { align-self: flex-start; background: #2563eb; color: white; border: none; padding: 0.75rem 1.25rem; border-radius: 0.5rem; cursor: pointer; }
</style>
