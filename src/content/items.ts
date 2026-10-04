import type { Item, Topic, Visual } from "./types";

const emoji = (value: string): Visual => ({ kind: "emoji", value });
const color = (value: string): Visual => ({ kind: "color", value });
const count = (n: number, value: string): Visual => ({ kind: "count", n, emoji: value });

const item = (
  id: string,
  text: string,
  visual: Visual,
  topic: Topic,
  ja: string,
  pattern?: string,
  abstract = false,
): Item => ({
  id,
  text,
  visual,
  topic,
  ja,
  ...(pattern ? { pattern } : {}),
  ...(abstract ? { abstract: true } : {}),
});

export const items: Item[] = [
  // Greetings
  item("hello", "Hello.", emoji("👋🙂"), "greetings", "こんにちは"),
  item("good-morning", "Good morning.", emoji("🌅👋"), "greetings", "おはよう"),
  item("goodbye", "Goodbye.", emoji("👋🚪"), "greetings", "さようなら"),
  item("whats-your-name", "What's your name?", emoji("❓🏷️"), "greetings", "おなまえは？", undefined, true),
  item("my-name-is-kiko", "My name is Kiko.", emoji("🧡🏷️"), "greetings", "わたしはキコです", "my-name-is"),
  item("how-are-you", "How are you?", emoji("❓💭"), "greetings", "げんきですか？", undefined, true),
  item("im-happy", "I'm happy.", emoji("😊✨"), "greetings", "うれしいです"),
  item("im-tired", "I'm tired.", emoji("😴💤"), "greetings", "つかれています"),

  // Colours
  item("red", "red", color("#ef5350"), "colors", "あか"),
  item("blue", "blue", color("#42a5f5"), "colors", "あお"),
  item("yellow", "yellow", color("#fbc02d"), "colors", "きいろ"),
  item("green", "green", color("#43a047"), "colors", "みどり"),
  item("pink", "pink", color("#ec70a4"), "colors", "ピンク"),
  item("purple", "purple", color("#8e62c8"), "colors", "むらさき"),
  item("black", "black", color("#30343b"), "colors", "くろ"),
  item("white", "white", color("#fffdf5"), "colors", "しろ"),
  item("its-red", "It's red.", emoji("🎨🔴"), "colors", "あかです", "its-color"),
  item("its-blue", "It's blue.", emoji("🎨🔵"), "colors", "あおです", "its-color"),

  // Animals
  item("cat", "cat", emoji("🐱"), "animals", "ねこ"),
  item("dog", "dog", emoji("🐶"), "animals", "いぬ"),
  item("bird", "bird", emoji("🐦"), "animals", "とり"),
  item("rabbit", "rabbit", emoji("🐰"), "animals", "うさぎ"),
  item("fish", "fish", emoji("🐟"), "animals", "さかな"),
  item("tiger", "tiger", emoji("🐯"), "animals", "とら"),
  item("its-a-cat", "It's a cat.", emoji("👉🐱"), "animals", "ねこです", "its-a"),
  item("its-a-dog", "It's a dog.", emoji("👉🐶"), "animals", "いぬです", "its-a"),

  // Numbers and counting
  item("one", "one", count(1, "⭐"), "numbers", "いち"),
  item("two", "two", count(2, "⭐"), "numbers", "に"),
  item("three", "three", count(3, "⭐"), "numbers", "さん"),
  item("four", "four", count(4, "⭐"), "numbers", "よん"),
  item("five", "five", count(5, "⭐"), "numbers", "ご"),
  item("six", "six", count(6, "⭐"), "numbers", "ろく"),
  item("seven", "seven", count(7, "⭐"), "numbers", "なな"),
  item("eight", "eight", count(8, "⭐"), "numbers", "はち"),
  item("nine", "nine", count(9, "⭐"), "numbers", "きゅう"),
  item("ten", "ten", count(10, "⭐"), "numbers", "じゅう"),
  item("one-cat", "One cat.", count(1, "🐱"), "numbers", "ねこ 1ぴき"),
  item("two-dogs", "Two dogs.", count(2, "🐶"), "numbers", "いぬ 2ひき"),
  item("three-birds", "Three birds.", count(3, "🐦"), "numbers", "とり 3わ"),

  // Food
  item("apple", "apple", emoji("🍎"), "food", "りんご"),
  item("banana", "banana", emoji("🍌"), "food", "バナナ"),
  item("pizza", "pizza", emoji("🍕"), "food", "ピザ"),
  item("rice", "rice", emoji("🍚"), "food", "ごはん"),
  item("bread", "bread", emoji("🍞"), "food", "パン"),
  item("ice-cream", "ice cream", emoji("🍨"), "food", "アイスクリーム"),
  item("its-an-apple", "It's an apple.", emoji("👉🍎"), "food", "りんごです", "its-a"),
  item("its-pizza", "It's pizza.", emoji("👉🍕"), "food", "ピザです", "its-a"),

  // Likes (earlier vocabulary deliberately mixed)
  item("i-like-cats", "I like cats.", emoji("❤️🐱"), "likes", "ねこがすきです", "i-like"),
  item("i-like-pizza", "I like pizza.", emoji("❤️🍕"), "likes", "ピザがすきです", "i-like"),
  item("i-like-blue", "I like blue.", emoji("❤️🔵"), "likes", "あおがすきです", "i-like"),
  item("i-like-dogs", "I like dogs.", emoji("❤️🐶"), "likes", "いぬがすきです", "i-like"),
  item("i-like-apples", "I like apples.", emoji("❤️🍎"), "likes", "りんごがすきです", "i-like"),
  item("i-like-red", "I like red.", emoji("❤️🔴"), "likes", "あかがすきです", "i-like"),

  // Questions and answers about likes
  item("do-you-like-cats", "Do you like cats?", emoji("❓🐱"), "likes", "ねこがすきですか？", "do-you-like"),
  item("do-you-like-pizza", "Do you like pizza?", emoji("❓🍕"), "likes", "ピザがすきですか？", "do-you-like"),
  item("do-you-like-blue", "Do you like blue?", emoji("❓🔵"), "likes", "あおがすきですか？", "do-you-like"),
  item("yes-i-do", "Yes, I do.", emoji("👍😊"), "likes", "はい、すきです"),
  item("no-i-dont", "No, I don't.", emoji("👎🙅"), "likes", "いいえ、すきではありません"),

  // Family
  item("mom", "mom", emoji("👩"), "family", "おかあさん"),
  item("dad", "dad", emoji("👨"), "family", "おとうさん"),
  item("brother", "brother", emoji("👦"), "family", "おとうと・おにいさん"),
  item("sister", "sister", emoji("👧"), "family", "いもうと・おねえさん"),
  item("grandma", "grandma", emoji("👵"), "family", "おばあちゃん"),
  item("grandpa", "grandpa", emoji("👴"), "family", "おじいちゃん"),
  item("this-is-my-mom", "This is my mom.", emoji("👉👩"), "family", "こちらはわたしのおかあさんです", "this-is-my"),
  item("this-is-my-dad", "This is my dad.", emoji("👉👨"), "family", "こちらはわたしのおとうさんです", "this-is-my"),
  item("i-have-a-brother", "I have a brother.", emoji("🙂👦"), "family", "わたしにはきょうだいがいます"),
];

export const itemsById: Readonly<Record<string, Item>> = Object.fromEntries(
  items.map((entry) => [entry.id, entry]),
);
