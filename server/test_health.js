async function test() {
  try {
    const response = await fetch('http://localhost:5000/api/health');
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Data:', data);
  } catch (err) {
    console.error('Health check failed:', err.message);
  }
}

test();
