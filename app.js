const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect(
    "insert_clustor_conn_here",
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
    }
);

const itemSchema = new mongoose.Schema({
    name: String,
});

const Item = mongoose.model("Item", itemSchema); // note: db name becomes items not Item

const item1 = new Item({
    name: "Click Add to add a new an item",
});
const item2 = new Item({
    name: "Click <--- checkbox to delete an item",
});

const startItems = [item1, item2];

const listSchema = {
    name: String,
    items: [itemSchema],
};

const List = mongoose.model("List", listSchema);

app.get("/", (req, res) => {
    Item.find({}, (err, results) => {
        if (results.length === 0) {
            Item.insertMany(startItems, (err) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Saved to database.");
                }
            });
            res.redirect("/");
        } else {
            res.render("list", {
                listTitle: "Today",
                newListItems: results,
            });
        }
    });
});

app.get("/lists", (req, res) => {
    res.redirect("/lists/" + req.query.name_field);
});

app.get("/lists/:activity", (req, res) => {
    const newName = _.capitalize(req.params.activity).replace(/\s/g, "");
    List.findOne({ name: newName }, (err, foundList) => {
        if (!err && newName !== "favicon.ico") {
            if (!foundList) {
                // Create new list
                const list = new List({
                    name: newName,
                    items: startItems,
                });
                list.save();
                res.redirect("/lists/" + newName);
            } else {
                // Display existing list
                res.render("list", {
                    listTitle: foundList.name,
                    newListItems: foundList.items,
                });
            }
        }
    });
});

app.post("/", (req, res) => {
    const itemName = req.body.newItem;
    const listName = _.capitalize(req.body.list).replace(/\s/g, "");

    const newItemDoc = new Item({
        name: itemName,
    });

    if (listName === "Today") {
        newItemDoc.save();
        res.redirect("/");
    } else {
        List.findOne({ name: listName }, (err, foundList) => {
            foundList.items.push(newItemDoc);
            foundList.save();
            res.redirect("/lists/" + listName);
        });
    }
});

app.post("/delete", (req, res) => {
    const listName = _.capitalize(req.body.listNameHiddenDel).replace(
        /\s/g,
        ""
    );
    const oldId = req.body.oldItemID;

    if (listName === "Today") {
        Item.findByIdAndRemove(oldId, (err) => {
            if (err) {
                console.log(err);
            } else {
                console.log("Deleted item");
            }
            res.redirect("/");
        });
    } else {
        List.findOneAndUpdate(
            { name: listName },
            { $pull: { items: { _id: oldId } } },
            (err, foundList) => {
                if (!err) {
                    res.redirect("/lists/" + listName);
                } else {
                    console.log(err);
                }
            }
        );
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Sever started on port 3000");
});
