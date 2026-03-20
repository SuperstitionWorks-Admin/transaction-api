import { getDb } from '@/lib/db';

async function getDashboardData() {
  const db = getDb();

  const [usageResult, logsResult, categoriesResult] = await Promise.all([
    db.from('api_usage').select('request_count'),
    db
      .from('categorization_logs')
      .select('original_text, normalized_text, merchant, category, confidence, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    db.from('categorization_logs').select('category'),
  ]);

  if (usageResult.error) {
    console.error('Error fetching usage data:', usageResult.error);
  }

  if (logsResult.error) {
    console.error('Error fetching logs:', logsResult.error);
  }

  if (categoriesResult.error) {
    console.error('Error fetching categories:', categoriesResult.error);
  }

  const usageRows = (usageResult.data ?? []) as Array<{ request_count: number | null }>;

const recentLogs = (logsResult.data ?? []) as Array<{
  original_text: string;
  normalized_text: string;
  merchant: string | null;
  category: string | null;
  confidence: number | null;
  created_at: string | null;
}>;

const categoryRows = (categoriesResult.data ?? []) as Array<{ category: string | null }>;

const totalRequests =
  usageRows.reduce((sum, row) => sum + (row.request_count || 0), 0);

const totalCategorized = recentLogs.length;

const categoryBreakdown =
  categoryRows.reduce<Record<string, number>>((acc, row) => {
    const category = row.category || 'uncategorized';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  return {
    totalRequests,
    totalCategorized,
    recentLogs,
    categoryBreakdown,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <main className="min-h-screen bg-white text-black p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Transaction Categorization API Dashboard</h1>
        <p className="text-gray-600 mb-8">Overview of API usage and recent categorization activity.</p>

        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <div className="border rounded-lg p-6">
            <h2 className="text-sm text-gray-500 mb-2">Total API Requests</h2>
            <p className="text-3xl font-semibold">{data.totalRequests}</p>
          </div>

          <div className="border rounded-lg p-6">
            <h2 className="text-sm text-gray-500 mb-2">Recent Categorized Transactions</h2>
            <p className="text-3xl font-semibold">{data.totalCategorized}</p>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <section className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Category Breakdown</h2>
            {Object.keys(data.categoryBreakdown).length === 0 ? (
              <p className="text-gray-500">No category data yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(data.categoryBreakdown).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between border-b pb-2">
                    <span className="capitalize">{category}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            {data.recentLogs.length === 0 ? (
              <p className="text-gray-500">No activity yet.</p>
            ) : (
              <div className="space-y-4">
                {data.recentLogs.map((log, index) => (
                  <div key={index} className="border-b pb-3">
                    <p className="font-medium">{log.original_text}</p>
                    <p className="text-sm text-gray-600">
                      {log.merchant || 'Unknown'} → {log.category} ({log.confidence})
                    </p>
                    <p className="text-xs text-gray-400">{log.created_at}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}