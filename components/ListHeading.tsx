import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type ListHeadingProps = {
  title: string;
  onViewAllPress?: () => void;
};

const ListHeading = ({ title, onViewAllPress }: ListHeadingProps) => {
  return (
    <View className="list-head">
      <Text className="list-title">{title}</Text>
      {onViewAllPress ? (
        <TouchableOpacity
          className="list-action"
          onPress={onViewAllPress}
        >
          <Text className="list-action-text">View all</Text>
        </TouchableOpacity>
      ) : (
        <Text className="list-action-text">View all</Text>
      )}
    </View>
  );
};

export default ListHeading;
