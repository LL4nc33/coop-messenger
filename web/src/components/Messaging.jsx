import api from "../app/Api";
import ChatInput from "./ChatInput";

const Messaging = (props) => {
  const subscription = props.selected;

  return (
    <>
      {subscription && (
        <ChatInput
          onSend={async (message, options) => {
            await api.publish(subscription.baseUrl, subscription.topic, message, options);
          }}
        />
      )}
    </>
  );
};

export default Messaging;
