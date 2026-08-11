const axios = require('axios');

async function checkApi() {
  try {
    const response = await axios.get('https://palegoldenrod-seal-794472.hostingersite.com/api/admin/offboarding/reporting-managers', {
      headers: {
        'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL3BhbGVnb2xkZW5yb2Qtc2VhbC03OTQ0NzIuaG9zdGluZ2Vyc2l0ZS5jb20vYXBpL2F1dGgvbG9naW4iLCJpYXQiOjE3ODY0MjAxODUsImV4cCI6MTc4NjQyMzc4NSwibmJmIjoxNzg2NDIwMTg1LCJqdGkiOiJ3UEtYZHVqMjgzYmQ3RmFDIiwic3ViIjoiMSIsInBydiI6IjIzYmQ1Yzg5NDlmNjAwYWRiMzllNzAxYzQwMDg3MmRiN2E1OTc2ZjcifQ.4Ne-I4raJlmTsr-RwE543b4P0rTKx4xEo9t3266rH8o',
        'Accept': 'application/json'
      }
    });
    console.log(JSON.stringify(response.data.data?.[0] || response.data?.[0] || response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.data);
  }
}

checkApi();
