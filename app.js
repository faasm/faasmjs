var express = require("express");
var logger = require("morgan");
var path = require("path");

express.static.mime.types["wasm"] = "application/wasm";

var app = express();

app.use(logger("dev"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Routes
var indexRouter = require("./routes/index");
var funcRouter = require("./routes/funcs");

app.use("/", indexRouter);
app.use("/func", funcRouter);

// Views
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

module.exports = app;
