import { app } from "./app.js";

const port = Number(process.env.PORT ?? 3001);
app.listen(port, "0.0.0.0", () => console.log(`API on http://0.0.0.0:${port}/api/v1`));
