<script lang="ts">
        let { data } = $props();
        const logs = $derived(data.logs ?? []);
</script>

<svelte:head>
        <title>Audit Logs</title>
</svelte:head>

<section class="card">
        <h2>Audit Logs</h2>
        <table>
                <thead>
                        <tr>
                                <th>Time</th>
                                <th>Action</th>
                                <th>Outcome</th>
                                <th>User</th>
                                <th>Details</th>
                        </tr>
                </thead>
                <tbody>
                        {#each logs as log}
                                <tr>
                                        <td>{log.createdAt.toString()}</td>
                                        <td>{log.action}</td>
                                        <td>{log.outcome}</td>
                                        <td>{log.userId ?? 'n/a'}</td>
                                        <td>{log.detail ?? '-'}</td>
                                </tr>
                        {/each}
                </tbody>
        </table>
</section>

<style>
        .card {
                background: white;
                padding: 1.5rem;
                border-radius: 0.75rem;
                box-shadow: 0 10px 30px rgba(15, 23, 42, 0.1);
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 0.5rem; border-bottom: 1px solid #e2e8f0; text-align: left; }
</style>
