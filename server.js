const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const { Schema } = mongoose;

const userNameSchema = new Schema({
  username: { type: String, required: true },
  count: { type: Number, default: 0 },
  log: [Schema.Types.Mixed],
});

const userModel = mongoose.model("userModel", userNameSchema);

const verifyRequiredFields = (des, dur, id) => {
  return id === ""
    ? "Missing id"
    : des === ""
    ? "Missing description"
    : dur === ""
    ? "Missing duration"
    : true;
};
// POST NEW USER
app.post("/api/exercise/new-user", (req, res) => {
  const { username } = req.body;
  if (username === "") {
    res.send("Path `username` is required.");
  } else {
    userModel.exists({ username: username }).then((bol) => {
      if (bol) {
        res.send("Username already taken");
      } else {
        const newUser = new userModel({
          username: username,
        });
        newUser.save((err, data) => {
          if (err) return res.send(err);
          res.json({ username: data.username, _id: data["_id"] });
        });
      }
    });
  }
});
// POST EXERCISE
app.post("/api/exercise/add", (req, res) => {
  const { userId, description, duration, date } = req.body;
  const validation = verifyRequiredFields(description, duration, userId);
  if (validation === true) {
    userModel
      .exists({ _id: userId })
      .then((result) => {
        if (result === false) return res.send("results returned false");
        userModel.findById(userId, (err, doc) => {
          if (err) return res.send(`an error ocurred:${err}`);
          doc.log.push({
            description: description,
            duration: Number(duration),
            date:
              date == ""
                ? new Date().toDateString()
                : new Date(`${date}T00:00:00`).toDateString(),
          });
          doc.count++;
          doc.save((err, data) => {
            if (err) return err;
          });
          res.send({
            _id: doc["_id"],
            username: doc.username,
            date:
              date == ""
                ? new Date().toDateString()
                : new Date(`${date}T00:00:00`).toDateString(),
            duration: Number(duration),
            description: description,
          });
        });
      })
      .catch((err) => res.send("Invalid Username"));
  } else {
    res.send(validation);
  }
});
// GET USER LOG
app.get("/api/exercise/log", (req, res) => {
  let { userId: uid, from: fromDate, to: toDate, limit: limitDocs } = req.query;
  userModel.findById(uid, (err, doc) => {
    if (err) return console.log(err);
    res.json(getLogs(doc, fromDate, toDate, limitDocs, uid));
  });
});
// GET ALL USERS
app.get("/api/exercise/users", (req, res) => {
  userModel
    .find({ username: /.+/ })
    .then((users) => {
      res.send(users);
    })
    .catch((err) => res.send(err));
});
// USER LOG FUNCTION
const getLogs = (doc, fDate, tDate, lDoc, uid) => {
  let resultDocument = {};
  if (fDate != null && toDate != null) {
    fDate += "t00:00:00";
    tDate += "t00:00:00";
    const fMili = new Date(fDate).getTime(),
      tMili = new Date(tMili).getTime();
    let filteredLog = doc.log.filter((i) => {
      let dMili = new Date(i.date);
      return dMili >= fMili && dMili <= tMili;
    });
    resultDocument = {
      _id: uid,
      username: doc.username,
      count: filteredLog.length,
      from: new Date(fDate).toDateString(),
      to: new Date(tDate).toDateString(),
      log: filteredLog,
    };
  } else if (fDate != null && tDate == null) {
    let resultDocument = {};
    fDate += "t00:00:00";
    const fMili = new Date(fDate).getTime();
    let filteredLog = doc.log.filter((i) => {
      let dMili = new Date(i.date);
      return dMili >= fMili;
    });
    resultDocument = {
      _id: uid,
      username: doc.username,
      count: filteredLog.length,
      from: new Date(fDate).toDateString(),
      log: filteredLog,
    };
  } else if ((fDate == null) & (tDate != null)) {
    tDate += "t00:00:00";
    const tMili = new Date(tMili).getTime();
    let filteredLog = doc.log.filter((i) => {
      let dMili = new Date(i.date);
      return dMili <= tMili;
    });
    resultDocument = {
      _id: uid,
      username: doc.username,
      count: filteredLog.length,
      to: new Date(tDate).toDateString(),
      log: filteredLog,
    };
  } else {
    resultDocument = {
      _id: uid,
      username: doc.username,
      count: doc.log.length,
      log: doc.log,
    };
  }
  if (lDoc != null) {
    for (let i = resultDocument.log.length; i > lDoc; i--) {
      resultDocument.log.pop();
    }
  }
  return resultDocument;
};
