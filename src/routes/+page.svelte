<svelte:head>
        <title>Secure Orders</title>
</svelte:head>

<section class="hero">
        <div>
                <h1>Secure Order Management</h1>
                <p>
                        Demonstration app for CSSECDV showcasing authentication, authorization, validation, and logging
                        patterns.
                </p>
                <div class="links">
                        <a class="button" href="/login">Login</a>
                        <a class="button secondary" href="/register">Register</a>
                </div>
        </div>
</section>

<style>
        .hero {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 70vh;
                text-align: center;
        }
        .links {
                margin-top: 1.5rem;
                display: flex;
                gap: 1rem;
                justify-content: center;
        }
        .button {
                padding: 0.75rem 1.5rem;
                border-radius: 0.5rem;
                text-decoration: none;
                background: #2563eb;
                color: white;
        }
        .button.secondary {
                background: #0f172a;
        }
</style>
