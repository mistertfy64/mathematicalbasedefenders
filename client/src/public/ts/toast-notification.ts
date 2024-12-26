enum ToastNotificationPosition {
  TOP_RIGHT = 2,
  BOTTOM_RIGHT = 8
}

class ToastNotification {
  static notifications: Array<ToastNotification> = [];
  static nextID: number = 1;

  text: string;
  age: number;
  renderTime!: Date;
  position: ToastNotificationPosition;
  id: number;
  lifespan: number;
  foregroundColor!: string | null;
  backgroundColor!: string | null;
  borderColor!: string | null;

  constructor(
    text: string,
    position?: ToastNotificationPosition,
    lifespan?: number,
    foregroundColor?: string,
    backgroundColor?: string,
    borderColor?: string
  ) {
    this.text = text;
    this.position = position || ToastNotificationPosition.BOTTOM_RIGHT;
    this.id = ToastNotification.nextID;
    ToastNotification.nextID++;
    this.lifespan = lifespan || 5000;
    this.age = 0;
    this.foregroundColor = foregroundColor || null;
    this.backgroundColor = backgroundColor || null;
    this.borderColor = borderColor || null;
    this.render();
  }

  render() {
    ToastNotification.notifications.push(this);
    this.renderTime = new Date();
    const fgColorTag = this.foregroundColor
      ? `color:${this.foregroundColor};`
      : ``;
    const bgColorTag = this.backgroundColor
      ? `background-color:${this.backgroundColor};`
      : ``;
    const bdColorTag = this.borderColor
      ? `border-color:${this.borderColor};`
      : ``;

    let id = this.id;
    // TODO: This is only for bottom right (pos 8)
    for (let toast of ToastNotification.notifications) {
      if (toast.position !== this.position) {
        continue;
      }
      $(`#toast-notification--${toast.id}`).animate({ bottom: "+=76" }, 500);
    }
    $("#main-content__toast-notification-container").append(
      `<div style='display:flex;justify-content:center;align-items:center;${fgColorTag}${bgColorTag}${bdColorTag}'class='text--centered toast-notification toast-notification--position-${this.position}' id='toast-notification--${this.id}'>${this.text}</div>`
    );
    setTimeout(function () {
      $(`#toast-notification--${id}`).remove();
      ToastNotification.notifications.splice(
        ToastNotification.notifications.findIndex(
          (element) => element.id === id
        ),
        1
      );
    }, this.lifespan);
  }
}

export { ToastNotification, ToastNotificationPosition };
