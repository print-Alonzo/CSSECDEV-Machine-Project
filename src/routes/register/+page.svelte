<script lang="ts">
        import { PASSWORD_RULE_DESCRIPTION } from '$lib/validation';
        import { enhance } from '$app/forms';

        let { form } = $props();
        const error = $derived(form?.error as string | undefined);
</script>

<svelte:head>
        <title>Register</title>
</svelte:head>

<section class="card">
        <h2>Create Account</h2>
        <form method="POST" use:enhance>
                <label>
                        Name
                        <input name="name" type="text" required minlength="2" maxlength="50" />
                </label>
                <label>
                        Email
                        <input name="email" type="email" autocomplete="username" required />
                </label>
                <label>
                        Password
                        <input name="password" type="password" autocomplete="new-password" required />
                </label>
                <label>
                        Confirm Password
                        <input name="confirm" type="password" autocomplete="new-password" required />
                </label>
                {#if error}
                        <div class="error">{error}</div>
                {/if}
                <p class="hint">Password policy: {PASSWORD_RULE_DESCRIPTION}</p>
                <button type="submit">Register</button>
        </form>
</section>

<style>
        .card {
                max-width: 520px;
                margin: 2rem auto;
                background: white;
                padding: 1.5rem;
                border-radius: 0.75rem;
                box-shadow: 0 10px 30px rgba(15, 23, 42, 0.1);
        }
        form { display: flex; flex-direction: column; gap: 1rem; }
        label { display: flex; flex-direction: column; gap: 0.35rem; }
        input { padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; }
        .error { color: #b91c1c; }
        .hint { color: #475569; font-size: 0.9rem; }
        button { align-self: flex-start; background: #2563eb; color: white; border: none; padding: 0.75rem 1.25rem; border-radius: 0.5rem; cursor: pointer; }
</style>
