// Test script untuk create module dengan semantic versioning
const projectId = 1; // Ganti dengan project ID yang valid

const testData = {
  parentModule: null,
  namaModule: "Test Module v2",
  ba: "Test BA v2",
  kode: "02",
  version: "1.2.3",
  baVersion: "2.0.1",
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
