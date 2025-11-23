
const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}/api/tabs`;

async function testTabsApi() {
  console.log("Starting Tabs API test...");

  try {
    // 1. Create a tab
    console.log("Creating tab...");
    const createRes = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Tab",
        elements: [{ id: "1", type: "rectangle" }],
        appState: { viewBackgroundColor: "#ffffff" }
      })
    });
    
    if (!createRes.ok) throw new Error(`Create failed: ${createRes.status}`);
    const { tab } = await createRes.json();
    console.log("Created tab:", tab._id);

    // 2. Get all tabs
    console.log("Fetching all tabs...");
    const listRes = await fetch(BASE_URL);
    if (!listRes.ok) throw new Error(`List failed: ${listRes.status}`);
    const { tabs } = await listRes.json();
    console.log("Found tabs:", tabs.length);
    const found = tabs.find((t: any) => t._id === tab._id);
    if (!found) throw new Error("Created tab not found in list");

    // 3. Get specific tab
    console.log("Fetching specific tab...");
    const getRes = await fetch(`${BASE_URL}/${tab._id}`);
    if (!getRes.ok) throw new Error(`Get failed: ${getRes.status}`);
    const { tab: fetchedTab } = await getRes.json();
    if (fetchedTab.name !== "Test Tab") throw new Error("Tab data mismatch");

    // 4. Update tab
    console.log("Updating tab...");
    const updateRes = await fetch(`${BASE_URL}/${tab._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Tab Name" })
    });
    if (!updateRes.ok) throw new Error(`Update failed: ${updateRes.status}`);

    // Verify update
    const verifyRes = await fetch(`${BASE_URL}/${tab._id}`);
    const { tab: updatedTab } = await verifyRes.json();
    if (updatedTab.name !== "Updated Tab Name") throw new Error("Update not reflected");

    // 5. Delete tab
    console.log("Deleting tab...");
    const deleteRes = await fetch(`${BASE_URL}/${tab._id}`, {
      method: "DELETE"
    });
    if (!deleteRes.ok) throw new Error(`Delete failed: ${deleteRes.status}`);

    // Verify delete
    const verifyDeleteRes = await fetch(`${BASE_URL}/${tab._id}`);
    if (verifyDeleteRes.status !== 404) throw new Error("Tab still exists after delete");

    console.log("Tabs API Test PASSED!");
    process.exit(0);

  } catch (error) {
    console.error("Tabs API Test FAILED:", error);
    process.exit(1);
  }
}

testTabsApi();
