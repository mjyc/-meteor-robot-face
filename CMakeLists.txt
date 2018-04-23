cmake_minimum_required(VERSION 2.8.3)
project(simple_face)

find_package(catkin REQUIRED COMPONENTS actionlib message_generation)

add_action_files(
  DIRECTORY action
  FILES
  DisplayMessage.action
  AskMultipleChoice.action
)

generate_messages(DEPENDENCIES std_msgs actionlib_msgs)

catkin_package(CATKIN_DEPENDS std_msgs message_runtime)
