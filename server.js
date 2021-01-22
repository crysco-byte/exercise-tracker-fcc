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
            duration: duration,
            date:
              date == null
                ? new Date().toDateString()
                : new Date(`${date}T00:00:00`).toDateString(),
          });
          doc.count++;
          doc.save((err, data) => {
            if (err) return err;
          });
          res.send(doc);
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
  fromDate += "T00:00:00";
  toDate += "T00:00:00";
  userModel.findById(uid, (err, doc) => {
    if (err) return res.send(err);
    let newDoc = {};
    // NARROW BY DATE RANGE
    if (fromDate != null && toDate != null) {
      const fromMili = new Date(fromDate).getTime(),
        toMili = new Date(toDate).getTime();
      const log = doc.log.filter((i) => {
        const dateMili = new Date(i.date).getTime();
        return dateMili >= fromMili && dateMili <= toMili;
      });
      newDoc = {
        _id: uid,
        username: doc.username,
        count: log.length,
        from: new Date(fromDate).toDateString(),
        to: new Date(toDate).toDateString(),
        log: log,
      };
    } else if ((fromDate != null) & (toDate == null)) {
      const fromMili = new Date(fromDate).getTime();
      const log = doc.log.filter((i) => {
        const dateMili = new Date(i.date).getTime();
        return dateMili >= fromMili;
      });
      newDoc = {
        _id: uid,
        username: doc.username,
        count: log.length,
        from: new Date(fromDate).toDateString(),
        log: log,
      };
    } else if ((fromDate == null) & (toDate != null)) {
      const toMili = new Date(toDate).getTime();
      const log = doc.log.filter((i) => {
        const dateMili = new Date(i.date).getTime();
        return dateMili <= toMili;
      });
      newDoc = {
        _id: uid,
        username: doc.username,
        count: log.length,
        to: new Date(toDate).toDateString(),
        log: log,
      };
    } else if ((limitDocs == null) & (toDate == null) & (fromDate == null)) {
      res.send(doc);
    }
    // SET LOG LIMIT
    if (limitDocs != null) {
      for (let i = newDoc.log.length; i > parseInt(limitDocs); i--) {
        newDoc.log.pop();
      }
    }
    // SEND IT
    res.send(newDoc);
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
