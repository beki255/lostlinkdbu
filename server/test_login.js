const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'eyobbegashaw075@gmail.com',
      password: 'password123' // I don't know the password, but it should return 401, not 500
    });
    console.log('Response:', res.data);
  } catch (err) {
    console.log('Error status:', err.response?.status);
    console.log('Error data:', err.response?.data);
  }
}

test();
