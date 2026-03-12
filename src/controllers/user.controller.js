import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// to check user is exist or not we have to import user from mongoose
import { User } from "../models/user.model.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation = not empty
  // check if user already exists ? username || email
  // check for images && avatar - mandatory
  // upload them to cloudinary : check avatar
  // create user object - create entry in DB
  // remove pass and refresh token field from response
  // check for user creation if {return res} else error

  // get user details from frontend
  const { fullName, email, username, password } = req.body;
  console.log(req.body);

  // validation = not empty
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check if user already exists ? username || email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "user with email or username already exist");
  }

  // check for images && avatar - mandatory

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // upload them to cloudinary

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // check avatar : mandatory
  if (!avatar) {
    throw new ApiError(400, "Avatar is mandatory");
  }

  // if all things done then
  // create user object - create entry in DB

  console.log("Creating user.......");
  let user;
  try {
    user = await User.create({
      fullName,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase(),
    });
    console.log("User created!", user._id);
  } catch (err) {
    console.log("User.create() error:", err.message);
    throw err;
  }

  // now user created
  // remove pass and refresh token field from response

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // check user field is empty or not

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering user");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

export { registerUser };
