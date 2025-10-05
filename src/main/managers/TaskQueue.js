class TaskQueue {
  constructor() {
    this.queue = [];
    this.running = false;
    this.currentTask = null;
  }

  // Thêm task vào hàng đợi
  addTask(task) {
    const taskId = Date.now() + Math.random();
    const taskObj = {
      id: taskId,
      ...task,
      status: 'pending',
      addedAt: new Date(),
      result: null
    };
    
    this.queue.push(taskObj);
    
    // Tự động chạy nếu chưa có task nào đang chạy
    if (!this.running) {
      this.processQueue();
    }
    
    return taskId;
  }

  // Xử lý hàng đợi
  async processQueue() {
    if (this.running || this.queue.length === 0) {
      return;
    }

    this.running = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      this.currentTask = task;
      task.status = 'running';
      task.startedAt = new Date();

      try {
        // Gọi callback để thông báo task đang chạy
        if (task.onStart) {
          task.onStart(task);
        }

        // Thực thi task
        const result = await task.execute();
        task.result = result;
        task.status = 'completed';
        task.completedAt = new Date();

        // Callback khi hoàn thành
        if (task.onComplete) {
          task.onComplete(result);
        }
      } catch (error) {
        task.status = 'failed';
        task.error = error.message;
        task.completedAt = new Date();

        // Callback khi lỗi
        if (task.onError) {
          task.onError(error);
        }
      }
    }

    this.running = false;
    this.currentTask = null;
  }

  // Lấy trạng thái hàng đợi
  getStatus() {
    return {
      queueLength: this.queue.length,
      running: this.running,
      currentTask: this.currentTask ? {
        id: this.currentTask.id,
        type: this.currentTask.type,
        accountId: this.currentTask.accountId,
        status: this.currentTask.status
      } : null,
      pendingTasks: this.queue.map(t => ({
        id: t.id,
        type: t.type,
        accountId: t.accountId,
        status: t.status
      }))
    };
  }

  // Xóa tất cả tasks trong queue
  clearQueue() {
    this.queue = [];
  }
}

module.exports = TaskQueue;

