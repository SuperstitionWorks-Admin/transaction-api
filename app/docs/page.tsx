import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Transaction Categorization API
          </h1>
          <p className="text-slate-600">
            Automatically categorize financial transaction descriptions with merchant identification
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-3">
                All requests must include an API key in the <code className="bg-slate-100 px-1 py-0.5 rounded">x-api-key</code> header:
              </p>
              <pre className="bg-slate-900 text-slate-50 p-3 rounded text-sm">
x-api-key: your_api_key_here
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>POST /api/v1/categorize</CardTitle>
              <CardDescription>
                Categorize transaction descriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 mb-2">Request Body</h3>
                <pre className="bg-slate-900 text-slate-50 p-3 rounded text-sm overflow-x-auto">
{`{
  "transactions": [
    "WALMART SUPERCENTER 4821",
    "NETFLIX.COM",
    "STARBUCKS STORE #12345"
  ]
}`}
                </pre>
                <p className="text-xs text-slate-500 mt-2">Max 100 transactions per request</p>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-slate-900 mb-2">Success Response (200)</h3>
                <pre className="bg-slate-900 text-slate-50 p-3 rounded text-sm overflow-x-auto">
{`{
  "results": [
    {
      "original": "WALMART SUPERCENTER 4821",
      "normalized": "walmart supercenter",
      "merchant": "Walmart",
      "category": "groceries",
      "confidence": 0.95
    }
  ],
  "meta": {
    "count": 1
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Error Responses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 mb-1">400 Bad Request</h3>
                <pre className="bg-slate-900 text-slate-50 p-3 rounded text-sm">
{`{ "error": "invalid_request" }`}
                </pre>
                <p className="text-xs text-slate-500 mt-1">Invalid JSON, empty array, or exceeds 100 transactions</p>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-slate-900 mb-1">401 Unauthorized</h3>
                <pre className="bg-slate-900 text-slate-50 p-3 rounded text-sm">
{`{ "error": "missing_api_key" }`}
                </pre>
                <p className="text-xs text-slate-500 mt-1">No API key provided</p>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-slate-900 mb-1">403 Forbidden</h3>
                <pre className="bg-slate-900 text-slate-50 p-3 rounded text-sm">
{`{ "error": "invalid_api_key" }`}
                </pre>
                <p className="text-xs text-slate-500 mt-1">Invalid or inactive API key</p>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-slate-900 mb-1">429 Too Many Requests</h3>
                <pre className="bg-slate-900 text-slate-50 p-3 rounded text-sm">
{`{ "error": "rate_limit_exceeded" }`}
                </pre>
                <p className="text-xs text-slate-500 mt-1">60 requests per minute or monthly limit exceeded</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supported Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">groceries</Badge>
                <Badge variant="outline">dining</Badge>
                <Badge variant="outline">entertainment</Badge>
                <Badge variant="outline">transportation</Badge>
                <Badge variant="outline">utilities</Badge>
                <Badge variant="outline">shopping</Badge>
                <Badge variant="outline">healthcare</Badge>
                <Badge variant="outline">travel</Badge>
                <Badge variant="outline">subscriptions</Badge>
                <Badge variant="outline">other</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Example Request</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-900 text-slate-50 p-3 rounded text-sm overflow-x-auto">
{`curl -X POST https://yourdomain.com/api/v1/categorize \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: your_api_key_here" \\
  -d '{
    "transactions": [
      "WALMART SUPERCENTER 4821",
      "NETFLIX.COM"
    ]
  }'`}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
