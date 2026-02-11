import api from "../app/Api";
import ChatInput from "./ChatInput";

const Messaging = (props) => {
  const subscription = props.selected;

  return (
    <>
      {subscription && (
        <ChatInput
          onSend={async (message) => {
            await api.publish(subscription.baseUrl, subscription.topic, message);
          }}
        />
      )}
    </>
  );
};

export default Messaging;
