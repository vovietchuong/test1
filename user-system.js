// user-system.js
class UserSystem {
    constructor(authSystem) {
        this.authSystem = authSystem;
        this.scoresPerPage = 10;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadProfileData();
    }

    setupEventListeners() {
        // Profile form submission
        this.addEvent(document.getElementById('profile-form'), 'submit', (e) => this.handleProfileUpdate(e));

        // Avatar change
        const changeAvatarBtn = document.getElementById('change-avatar-btn');
        const avatarUpload = document.getElementById('avatar-upload');
        if (changeAvatarBtn && avatarUpload) {
            changeAvatarBtn.addEventListener('click', () => avatarUpload.click());
            avatarUpload.addEventListener('change', (e) => this.handleAvatarUpload(e));
        }

        // Progress filters
        this.addEvent(document.getElementById('progress-game-filter'), 'change', () => this.loadProgressData());
        this.addEvent(document.getElementById('progress-sort'), 'change', () => this.loadProgressData());

        // Challenge button
        this.addEvent(document.getElementById('challenge-btn'), 'click', () => this.openChallengeModal());

        // Send challenge
        this.addEvent(document.getElementById('send-challenge-btn'), 'click', () => this.sendChallenge());
    }

    // Helper method để thêm event listener an toàn
    addEvent(element, event, handler) {
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    async loadProfileData() {
        const user = this.authSystem.auth.currentUser;
        if (!user) return;

        // Update profile form
        const profileName = document.getElementById('profile-name');
        const profileEmail = document.getElementById('profile-email');
        if (profileName) profileName.value = user.displayName || '';
        if (profileEmail) profileEmail.value = user.email || '';

        // Update avatar
        this.updateAvatar(user.photoURL);

        // Load progress data
        this.loadProgressData();

        // Load challenge history
        this.loadChallengeHistory();
    }

    updateAvatar(photoURL) {
        if (photoURL) {
            const avatarHTML = `<img src="${photoURL}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            
            const profileAvatar = document.getElementById('profile-avatar');
            if (profileAvatar) profileAvatar.innerHTML = avatarHTML;
            
            const userAvatar = document.getElementById('user-avatar');
            if (userAvatar) userAvatar.innerHTML = avatarHTML;
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        const user = this.authSystem.auth.currentUser;
        if (!user) return;

        const name = document.getElementById('profile-name').value;
        
        if (!name) {
            this.authSystem.showToast('Vui lòng nhập tên!', 'error');
            return;
        }
        
        try {
            await user.updateProfile({ displayName: name });

            // Update UI
            if (this.authSystem.userName) {
                this.authSystem.userName.textContent = name;
            }
            
            // Update localStorage
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            currentUser.name = name;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            this.authSystem.showToast('Cập nhật hồ sơ thành công!', 'success');
        } catch (error) {
            this.authSystem.showToast('Có lỗi xảy ra khi cập nhật hồ sơ: ' + error.message, 'error');
        }
    }

    async handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Kiểm tra kích thước file (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            this.authSystem.showToast('Ảnh không được lớn hơn 2MB!', 'error');
            return;
        }

        // Kiểm tra loại file
        if (!file.type.startsWith('image/')) {
            this.authSystem.showToast('Vui lòng chọn file ảnh!', 'error');
            return;
        }

        const user = this.authSystem.auth.currentUser;
        if (!user) return;

        try {
            // Upload to Firebase Storage
            const storageRef = this.authSystem.storage.ref();
            const avatarRef = storageRef.child(`avatars/${user.uid}`);
            await avatarRef.put(file);

            // Get download URL
            const downloadURL = await avatarRef.getDownloadURL();

            // Update user profile
            await user.updateProfile({ photoURL: downloadURL });

            // Update UI
            this.updateAvatar(downloadURL);

            // Update localStorage
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            currentUser.photoURL = downloadURL;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            this.authSystem.showToast('Cập nhật ảnh đại diện thành công!', 'success');
            
            // Reset input file
            e.target.value = '';
        } catch (error) {
            this.authSystem.showToast('Có lỗi xảy ra khi tải ảnh lên: ' + error.message, 'error');
        }
    }

    async loadProgressData(page = 1) {
        const user = this.authSystem.auth.currentUser;
        if (!user) return;

        const progressList = document.getElementById('progress-list');
        if (!progressList) return;

        progressList.innerHTML = '<p class="no-progress">Đang tải dữ liệu...</p>';

        try {
            let query = this.authSystem.firestore.collection('scores')
                .where('userId', '==', user.uid);

            // Apply game filter
            const gameFilter = document.getElementById('progress-game-filter')?.value || 'all';
            if (gameFilter !== 'all') {
                query = query.where('gameId', '==', gameFilter);
            }

            // Apply sort
            const sortValue = document.getElementById('progress-sort')?.value || 'newest';
            let sortField, sortDirection;
            
            switch (sortValue) {
                case 'newest':
                    sortField = 'timestamp';
                    sortDirection = 'desc';
                    break;
                case 'oldest':
                    sortField = 'timestamp';
                    sortDirection = 'asc';
                    break;
                case 'highest':
                    sortField = 'score';
                    sortDirection = 'desc';
                    break;
                case 'lowest':
                    sortField = 'score';
                    sortDirection = 'asc';
                    break;
                default:
                    sortField = 'timestamp';
                    sortDirection = 'desc';
            }

            // Get data
            const snapshot = await query
                .orderBy(sortField, sortDirection)
                .limit(this.scoresPerPage)
                .offset((page - 1) * this.scoresPerPage)
                .get();

            const scores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Calculate stats
            this.calculateStats(scores);

            // Display scores
            this.displayProgressScores(scores);
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu tiến trình:', error);
            progressList.innerHTML = '<p class="no-progress">Có lỗi xảy ra khi tải dữ liệu.</p>';
        }
    }

    calculateStats(scores) {
        const totalGames = document.getElementById('total-games');
        const highScore = document.getElementById('high-score');
        const averageScore = document.getElementById('average-score');

        if (!scores.length) {
            if (totalGames) totalGames.textContent = '0';
            if (highScore) highScore.textContent = '0';
            if (averageScore) averageScore.textContent = '0';
            return;
        }

        const total = scores.length;
        const maxScore = Math.max(...scores.map(score => score.score));
        const avgScore = scores.reduce((sum, score) => sum + score.score, 0) / total;

        if (totalGames) totalGames.textContent = total;
        if (highScore) highScore.textContent = maxScore;
        if (averageScore) averageScore.textContent = avgScore.toFixed(1);
    }

    displayProgressScores(scores) {
        const progressList = document.getElementById('progress-list');
        if (!progressList) return;

        if (!scores.length) {
            progressList.innerHTML = '<p class="no-progress">Chưa có dữ liệu tiến trình. Hãy chơi các trò chơi để xem tiến trình tại đây!</p>';
            return;
        }

        const html = scores.map(score => {
            const date = score.timestamp ? score.timestamp.toDate().toLocaleDateString('vi-VN') : 'Chưa xác định';
            
            return `
                <div class="progress-item">
                    <div class="progress-game">${score.gameName}</div>
                    <div class="progress-score">${score.score} điểm</div>
                    <div class="progress-date">${date}</div>
                </div>
            `;
        }).join('');

        progressList.innerHTML = html;
    }

    openChallengeModal() {
        const challengeModal = document.getElementById('challenge-modal');
        if (challengeModal) {
            challengeModal.style.display = 'flex';
            this.loadFriendsForChallenge();
        }
    }

    async loadFriendsForChallenge() {
        // Placeholder - sẽ được phát triển trong phiên bản tiếp theo
        const challengeFriend = document.getElementById('challenge-friend');
        if (challengeFriend) {
            challengeFriend.innerHTML = `
                <option value="">-- Tính năng bạn bè sẽ được phát triển sau --</option>
            `;
        }
    }

    async sendChallenge() {
        this.authSystem.showToast('Tính năng thách đấu sẽ được phát triển trong phiên bản tiếp theo!', 'info');
    }

    async loadChallengeHistory() {
        // Placeholder - sẽ được phát triển trong phiên bản tiếp theo
        const challengeHistoryList = document.getElementById('challenge-history-list');
        if (challengeHistoryList) {
            challengeHistoryList.innerHTML = `
                <p style="text-align: center; color: #777; padding: 20px;">
                    Tính năng thách đấu sẽ được phát triển trong phiên bản tiếp theo.
                </p>
            `;
        }
    }
}

// Thêm CSS cho các phần tử mới
const progressStyles = `
    .progress-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #eee;
        transition: background 0.3s ease;
    }
    
    .progress-item:hover {
        background: #f8f9fa;
    }
    
    .progress-game {
        flex: 2;
        font-weight: 500;
    }
    
    .progress-score {
        flex: 1;
        text-align: center;
        font-weight: bold;
        color: #4a90e2;
    }
    
    .progress-date {
        flex: 1;
        text-align: right;
        color: #777;
        font-size: 0.9rem;
    }
    
    @media (max-width: 768px) {
        .progress-item {
            flex-direction: column;
            text-align: center;
            gap: 0.5rem;
        }
        
        .progress-game,
        .progress-score,
        .progress-date {
            text-align: center;
        }
    }
`;

// Thêm styles vào DOM
document.addEventListener('DOMContentLoaded', function() {
    if (!document.querySelector('style[data-progress-styles]')) {
        const styleElement = document.createElement('style');
        styleElement.textContent = progressStyles;
        styleElement.setAttribute('data-progress-styles', 'true');
        document.head.appendChild(styleElement);
    }
});