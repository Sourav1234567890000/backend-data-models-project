import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
  path: "./env",
});

let PORT = process.env.PORT;

connectDB()
  .then(() => {
    app.listen(PORT || 8000, () => {
      console.log(`Server is running at port : ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(`MONGO db connection failed !!!`, err);
  });
