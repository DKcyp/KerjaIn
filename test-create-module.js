// Test script untuk debug create module
const projectId = 1; // Ganti dengan project ID yang valid

const testData = {
  parentModule: null,
  namaModule: "Test Module",
  ba: "Test BA",
  kode: "01",
};

fetch(`http://localhost:3000/api/blueprint-baru/${projectId}/module`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(testData),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("Response:", JSON.stringify(data, null, 2));
  })
  .catch((err) => {
    console.error("Error:", err);
  });
