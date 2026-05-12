const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GIST_ID = "cd44651c08f7f37e0bc514c42cf3d702";

export default async function handler(req, res) {
  // 1. Handle GET (Fetch World Data)
  if (req.method === 'GET') {
    try {
      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`);
      const data = await response.json();
      const content = JSON.parse(data.files["db.json"].content);
      return res.status(200).json(content);
    } catch (e) {
      return res.status(500).json({ error: "Fetch Failed" });
    }
  }

  // 2. Handle POST (Update World Data)
  if (req.method === 'POST') {
    try {
      const newWorldData = req.body;
      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            "db.json": { content: JSON.stringify(newWorldData) }
          }
        })
      });
      if (response.ok) return res.status(200).json({ success: true });
      else throw new Error("Update Failed");
    } catch (e) {
      return res.status(500).json({ error: "Sync Failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
