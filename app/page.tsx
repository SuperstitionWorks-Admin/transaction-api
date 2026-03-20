import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, FileText, LayoutDashboard, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Transaction Categorization API
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Automatically categorize transaction descriptions with clean, structured results
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <LayoutDashboard className="h-5 w-5 text-blue-600" />
                <CardTitle>Dashboard</CardTitle>
              </div>
              <CardDescription>
                Interactive interface to test the API with real-time results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard">
                <Button className="w-full">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-green-600" />
                <CardTitle>Documentation</CardTitle>
              </div>
              <CardDescription>
                Complete API reference with examples and response schemas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/docs">
                <Button variant="outline" className="w-full">
                  View Docs
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-8">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-yellow-600" />
            <h2 className="text-2xl font-bold text-slate-900">Quick Start</h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">1. Send a POST request</h3>
              <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm">
{`POST /api/v1/categorize
Content-Type: application/json

{
  "transactions": [
    "WALMART SUPERCENTER 4821",
    "NETFLIX.COM"
  ]
}`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">2. Receive categorized results</h3>
              <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs">
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
  "meta": { "count": 1 }
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
