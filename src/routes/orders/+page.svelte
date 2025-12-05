<script lang="ts">
        let { data } = $props();
        const orders = $derived(data.orders ?? []);
        const user = $derived(data.user);
</script>

<svelte:head>
        <title>Orders</title>
</svelte:head>

<section class="card">
        <h2>New Order</h2>
        <form method="POST" action="?/create">
                <label>
                        Description
                        <input name="description" required minlength="3" maxlength="100" />
                </label>
                <label>
                        Quantity
                        <input name="quantity" type="number" min="1" max="1000" required />
                </label>
                <button type="submit">Create</button>
        </form>
</section>

<section class="card">
        <h2>Orders</h2>
        {#if orders.length === 0}
                <p>No orders yet.</p>
        {:else}
                <table>
                        <thead>
                                <tr>
                                        <th>ID</th>
                                        <th>Description</th>
                                        <th>Qty</th>
                                        <th>Status</th>
                                        <th>Owner</th>
                                        <th>Actions</th>
                                </tr>
                        </thead>
                        <tbody>
                                {#each orders as order}
                                        <tr>
                                                <td>{order.id.slice(0, 6)}...</td>
                                                <td>{order.description}</td>
                                                <td>{order.quantity}</td>
                                                <td>{order.status}</td>
                                                <td>{order.ownerId === user?.id ? 'You' : order.ownerId}</td>
                                                <td class="actions">
                                                        <form method="POST" action="?/update">
                                                                <input type="hidden" name="id" value={order.id} />
                                                                <input
                                                                        name="description"
                                                                        value={order.description}
                                                                        minlength="3"
                                                                        maxlength="100"
                                                                />
                                                                <input type="number" name="quantity" value={order.quantity} min="1" max="1000" />
                                                                <select name="status" bind:value={order.status}>
                                                                        <option value="PENDING">Pending</option>
                                                                        <option value="APPROVED">Approved</option>
                                                                        <option value="CANCELLED">Cancelled</option>
                                                                </select>
                                                                <button type="submit">Save</button>
                                                        </form>
                                                        <form method="POST" action="?/delete">
                                                                <input type="hidden" name="id" value={order.id} />
                                                                <button type="submit">Delete</button>
                                                        </form>
                                                </td>
                                        </tr>
                                {/each}
                        </tbody>
                </table>
        {/if}
</section>

<style>
        .card {
                background: white;
                padding: 1.5rem;
                border-radius: 0.75rem;
                box-shadow: 0 10px 30px rgba(15, 23, 42, 0.1);
                margin-bottom: 1.5rem;
        }
        form { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
        label { display: flex; flex-direction: column; gap: 0.35rem; }
        input, select { padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        th, td { padding: 0.5rem; border-bottom: 1px solid #e2e8f0; }
        .actions form { margin-bottom: 0.5rem; }
        button { background: #2563eb; color: white; border: none; padding: 0.5rem 0.75rem; border-radius: 0.5rem; cursor: pointer; }
</style>
