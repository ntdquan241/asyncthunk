import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const API = "https://jsonplaceholder.typicode.com/posts";

const request = async (url, options) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

export const fetchPosts = createAsyncThunk("posts/fetchPosts", async () => {
  return await request(`${API}?_limit=10`);
});

export const addPost = createAsyncThunk("posts/addPost", async (newPost) => {
  return await request(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newPost),
  });
});

// CẬP NHẬT LẠI THUNK UPDATE
export const updatePost = createAsyncThunk("posts/updatePost", async (post) => {
  // Fix lỗi JSONPlaceholder: Vì server giả lập không có bài viết nào có ID > 100,
  // Gọi PUT sẽ bị lỗi 500. Ta sẽ chặn và trả về kết quả giả lập trực tiếp nếu id >= 100.
  if (post.id >= 100) {
    return new Promise((resolve) => setTimeout(() => resolve(post), 500));
  }
  
  return await request(`${API}/${post.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(post),
  });
});

export const deletePost = createAsyncThunk("posts/deletePost", async (id) => {
  // Tương tự, tránh gọi DELETE lên server giả nếu id >= 100
  if (id < 100) {
    await request(`${API}/${id}`, { method: "DELETE" });
  }
  return id; // Trả về id để reducer biết phần tử nào cần loại bỏ
});

const postsSlice = createSlice({
  name: "posts",
  initialState: { items: [], status: "idle", error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(addPost.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      
      // CẬP NHẬT LẠI REDUCER UPDATE
      .addCase(updatePost.fulfilled, (state, action) => {
        // Fix lỗi so sánh sai kiểu dữ liệu (String vs Number)[cite: 3]
        const index = state.items.findIndex(
          (p) => String(p.id) === String(action.payload.id) 
        );
        if (index !== -1) {
          state.items[index] = action.payload; // Thay thế phần tử cũ[cite: 3]
        }
      })
      
      .addCase(deletePost.fulfilled, (state, action) => {
        state.items = state.items.filter(
          (p) => String(p.id) !== String(action.payload)
        );
      });
  },
});

export default postsSlice.reducer;

export const selectPosts = (state) => state.posts.items;
export const selectPostsStatus = (state) => state.posts.status;
export const selectPostsError = (state) => state.posts.error;