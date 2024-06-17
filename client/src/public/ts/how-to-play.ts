import { stageItems } from ".";

function formatHowToPlayText(gamesRemaining: number) {
  // how to play
  const plural = `${gamesRemaining == 1 ? "" : "s"}`;
  stageItems.textSprites.howToPlayText.text = "Tutorial:\n";
  stageItems.textSprites.howToPlayText.text +=
    "Type the number on the enemy or the answer to an expression on an enemy\n";
  stageItems.textSprites.howToPlayText.text +=
    "with the number row or your numpad on your keyboard.\n";
  stageItems.textSprites.howToPlayText.text +=
    "Press Space or Enter to submit an answer.\n";
  stageItems.textSprites.howToPlayText.text += `This will go away after ${gamesRemaining} more game${plural} in this session.\n`;
  stageItems.textSprites.howToPlayText.text +=
    "You can also turn off this message in the settings.\n";
}

export { formatHowToPlayText };
