#!/bin/bash

echo "🧪 Testing Node Shield Attack Detection"
echo ""

echo "✅ Test 1: SQL Injection"
curl -s "http://localhost:3001/search?q=admin' UNION SELECT 1,2,3--" | jq .
echo ""

echo "✅ Test 2: RCE Attack"
curl -s "http://localhost:3001/execute?cmd=require('child_process').exec('ls')" | jq .
echo ""

echo "✅ Test 3: Path Traversal"
curl -s "http://localhost:3001/file?file=../../etc/passwd" | jq .
echo ""

echo "✅ Test 4: Normal Request (should pass)"
curl -s "http://localhost:3001/search?q=admin" | jq .
echo ""

echo "📊 Checking Dashboard..."
curl -s "http://localhost:3001/api/attacks" | jq .
