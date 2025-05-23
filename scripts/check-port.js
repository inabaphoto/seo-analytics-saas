#!/usr/bin/env node

/**
 * 開発サーバーのポート使用状況を確認するスクリプト
 */

const net = require('net');

const ports = [3000, 3001, 3002, 3003, 8000, 8080];

async function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.close(() => {
        resolve({ port, available: true });
      });
    });
    
    server.on('error', () => {
      resolve({ port, available: false });
    });
  });
}

async function checkAllPorts() {
  console.log('🔍 ポート使用状況を確認中...\n');
  
  const results = await Promise.all(ports.map(checkPort));
  
  results.forEach(({ port, available }) => {
    const status = available ? '✅ 利用可能' : '❌ 使用中';
    console.log(`ポート ${port}: ${status}`);
  });
  
  const availablePorts = results.filter(r => r.available);
  
  if (availablePorts.length > 0) {
    console.log(`\n💡 推奨: npm run dev -- -p ${availablePorts[0].port}`);
    console.log(`📋 GCPコールバックURI: http://localhost:${availablePorts[0].port}/api/auth/google/callback`);
  } else {
    console.log('\n⚠️ すべてのポートが使用中です');
  }
}

checkAllPorts().catch(console.error);
