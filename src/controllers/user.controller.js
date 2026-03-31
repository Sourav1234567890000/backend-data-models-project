import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// to check user is exist or not we have to import user from mongoose
import { User } from "../models/user.model.js";

// easy to create a seperate method to generate userToken or accessToken

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // add these into user
    user.refreshToken = refreshToken;
    // save
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while generating refresh and access token"
    );
  }
};

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

  console.log(req.files);

  // check for images && avatar - mandatory

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

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

const loginUser = asyncHandler(async (req, res) => {
  // req.body -> data
  // username or email exist
  // find the user
  // password check
  // access and refresh token
  // send these token via cookies
  // respose - successfully login

  //1. take data from req.body

  const { email, username, password } = req.body;

  // need for both
  if (!username || !email) {
    throw new ApiError(400, "username or email is required");
  }

  // now find in db
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  // if user not found

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // if user found now check password

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credential");
  }

  // refresh token and access token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // optional
  const loggedInUser = User.findById(user._id).select(
    "-password -refreshToken"
  );

  // send it to the cookies

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  // but the problem here is i want user id but how
  // so in this case we have middleware - jare ho to milke jana
  // for this we can design our own middleware like multer.js we have for fotos
  // so we can create a auth middleware
})

export { registerUser, loginUser };
