import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { Provider, useDispatch, useSelector } from "react-redux";
import { store } from "./store";
import {
  fetchPosts, addPost, updatePost, deletePost,
  selectPosts, selectPostsStatus, selectPostsError,
} from "./postsSlice";

// Giao diện quản lý CRUD
function PostManager() {
  const dispatch = useDispatch();
  const posts = useSelector(selectPosts);
  const status = useSelector(selectPostsStatus);
  const error = useSelector(selectPostsError);

  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState(null);

  // READ: Lấy dữ liệu khi mount[cite: 3]
  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchPosts());
    }
  }, [status, dispatch]);

  // CREATE hoặc UPDATE[cite: 3]
  const handleSubmit = async () => {
    if (!title.trim()) return;

    try {
      if (editingId) {
        // unwap() để xử lý kết quả ngay tại nơi dispatch[cite: 3]
        await dispatch(updatePost({ id: editingId, title, body: "Nội dung React Native", userId: 1 })).unwrap();
      } else {
        await dispatch(addPost({ title, body: "Nội dung React Native", userId: 1 })).unwrap();
      }
      setTitle("");
      setEditingId(null);
    } catch (err) {
      Alert.alert("Lỗi", "Thao tác thất bại: " + err.message);
    }
  };

  const startEdit = (post) => {
    setEditingId(post.id);
    setTitle(post.title);
  };

  if (status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  if (status === "failed") {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Lỗi: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>CRUD với createAsyncThunk</Text>
      
      {/* Form nhập liệu */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Nhập tiêu đề bài viết..."
        />
        <Button 
          title={editingId ? "Cập nhật" : "Thêm mới"} 
          onPress={handleSubmit} 
        />
        {editingId && (
          <View style={{ marginTop: 10 }}>
            <Button 
              title="Hủy" 
              color="red" 
              onPress={() => { setEditingId(null); setTitle(""); }} 
            />
          </View>
        )}
      </View>

      {/* Danh sách */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <Text style={styles.postTitle}>{item.title}</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity onPress={() => startEdit(item)} style={styles.editBtn}>
                <Text style={styles.btnText}>Sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => dispatch(deletePost(item.id))} style={styles.deleteBtn}>
                <Text style={styles.btnText}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

// Bọc ứng dụng trong Provider[cite: 4]
export default function App() {
  return (
    <Provider store={store}>
      <PostManager />
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f5f5", marginTop: 30 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  form: { marginBottom: 20, backgroundColor: "#fff", padding: 15, borderRadius: 8, elevation: 2 },
  input: { borderWidth: 1, borderColor: "#ddd", padding: 10, marginBottom: 10, borderRadius: 5 },
  postCard: { backgroundColor: "#fff", padding: 15, marginBottom: 10, borderRadius: 8, elevation: 2 },
  postTitle: { fontSize: 16, marginBottom: 10 },
  actionButtons: { flexDirection: "row", justifyContent: "flex-end" },
  editBtn: { backgroundColor: "#4CAF50", padding: 8, borderRadius: 5, marginRight: 10 },
  deleteBtn: { backgroundColor: "#f44336", padding: 8, borderRadius: 5 },
  btnText: { color: "#fff", fontWeight: "bold" },
  errorText: { color: "red", fontSize: 16 }
});